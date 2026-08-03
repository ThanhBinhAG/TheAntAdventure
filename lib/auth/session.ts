import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  BG_SESSION_COOKIE,
  isBreakGlassSessionValid,
} from '@/lib/auth/break-glass';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export type AuthContext = {
  authenticated: boolean;
  isSuperAdmin: boolean;
  isBreakGlass: boolean;
  userId: string | null;
  email: string | null;
};

const BREAK_GLASS_ACTOR: AuthContext = {
  authenticated: true,
  isSuperAdmin: true,
  isBreakGlass: true,
  userId: null,
  email: null,
};

export async function authContextFromBreakGlassCookie(
  token: string | undefined,
): Promise<AuthContext | null> {
  if (!(await isBreakGlassSessionValid(token))) return null;
  return BREAK_GLASS_ACTOR;
}

/** Cookie-store based context (Route Handlers / Server Components). */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = cookies();
  const bg = cookieStore.get(BG_SESSION_COOKIE)?.value;
  const fromBg = await authContextFromBreakGlassCookie(bg);
  if (fromBg) return fromBg;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only */
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  return {
    authenticated: true,
    isSuperAdmin: false,
    isBreakGlass: false,
    userId: user.id,
    email: user.email ?? null,
  };
}

export async function requireBreakGlass(): Promise<AuthContext | null> {
  const ctx = await getAuthContext();
  if (!ctx.authenticated || !ctx.isBreakGlass || !ctx.isSuperAdmin) return null;
  return ctx;
}
