import 'server-only';
import { cookies } from 'next/headers';
import {
  ensureBreakGlassShadowPrivilegesOnce,
  isBreakGlassShadowEmail,
} from '@/lib/auth/break-glass-supabase';
import { getCurrentAuthzState } from '@/lib/auth/authz-state';
import { SUPABASE_ACCESS_COOKIE } from '@/lib/auth/supabase-cookie-names';
import { verifySupabaseAccessToken } from '@/lib/auth/supabase-jwt';

export type AuthContext = {
  authenticated: boolean;
  isSuperAdmin: boolean;
  isBreakGlass: boolean;
  userId: string | null;
  email: string | null;
};

/**
 * Keeps the verified JWT server-side and request-local by associating it with
 * the context object. It must never be added to `AuthContext`, because route
 * handlers can return that object in a JSON payload.
 */
const verifiedAccessTokens = new WeakMap<AuthContext, string>();

/** Cookie-store based context (Route Handlers / Server Components). */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const access = await verifySupabaseAccessToken(
    cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value,
  );
  if (!access) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  const authz = await getCurrentAuthzState({
    userId: access.userId,
    accessToken: cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value ?? '',
  });
  if (!authz?.isActive) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  const isBreakGlass = isBreakGlassShadowEmail(access.email);
  if (isBreakGlass) {
    try {
      await ensureBreakGlassShadowPrivilegesOnce();
    } catch {
      // Recovery session still authenticates; Access Control RPCs need the grant.
    }
  }

  const context: AuthContext = {
    authenticated: true,
    isSuperAdmin: isBreakGlass,
    isBreakGlass,
    userId: access.userId,
    email: access.email,
  };
  verifiedAccessTokens.set(context, cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value ?? '');
  return context;
}

/** Internal BFF bridge: returns the JWT only for this verified context object. */
export function getVerifiedSupabaseAccessToken(context: AuthContext): string | null {
  return context.authenticated ? verifiedAccessTokens.get(context) ?? null : null;
}

export async function requireBreakGlass(): Promise<AuthContext | null> {
  const ctx = await getAuthContext();
  if (!ctx.authenticated || !ctx.isBreakGlass || !ctx.isSuperAdmin) return null;
  return ctx;
}
