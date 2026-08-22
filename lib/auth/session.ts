import 'server-only';
import { cookies } from 'next/headers';
import { CRM_SESSION_COOKIE, getCrmSession } from '@/lib/auth/crm-session';

export type AuthContext = {
  authenticated: boolean;
  isSuperAdmin: boolean;
  isBreakGlass: boolean;
  userId: string | null;
  email: string | null;
};

/** Cookie-store based context (Route Handlers / Server Components). */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const session = await getCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value);
  if (!session) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  return {
    authenticated: true,
    isSuperAdmin: session.isBreakGlass,
    isBreakGlass: session.isBreakGlass,
    userId: session.userId,
    email: session.email,
  };
}

export async function requireBreakGlass(): Promise<AuthContext | null> {
  const ctx = await getAuthContext();
  if (!ctx.authenticated || !ctx.isBreakGlass || !ctx.isSuperAdmin) return null;
  return ctx;
}
