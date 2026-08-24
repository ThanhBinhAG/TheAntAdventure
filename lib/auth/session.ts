import 'server-only';
import { cookies } from 'next/headers';
import {
  CRM_ACCESS_COOKIE,
  CRM_SESSION_COOKIE,
  CRM_SUPABASE_ACCESS_COOKIE,
  getCrmSession,
  getCrmSessionRevocationStatus,
} from '@/lib/auth/crm-session';
import { verifyCrmAccessToken } from '@/lib/auth/crm-access-token';
import { ensureBreakGlassShadowPrivilegesOnce } from '@/lib/auth/break-glass-supabase';

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
  const access = await verifyCrmAccessToken(
    cookieStore.get(CRM_ACCESS_COOKIE)?.value,
    cookieStore.get(CRM_SUPABASE_ACCESS_COOKIE)?.value,
  );
  if (access) {
    const revocation = await getCrmSessionRevocationStatus(access.sid);
    if (revocation === 'active') {
      if (access.isBreakGlass) {
        try {
          await ensureBreakGlassShadowPrivilegesOnce();
        } catch {
          // Recovery session still authenticates; Access Control RPCs need the grant.
        }
      }
      return {
        authenticated: true,
        isSuperAdmin: access.isBreakGlass,
        isBreakGlass: access.isBreakGlass,
        userId: access.userId,
        email: access.email,
      };
    }
    if (revocation === 'revoked') {
      return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
    }
    // Redis outage: fall through to the durable session, which remains authoritative.
  }
  const session = await getCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value);
  if (!session) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  if (session.isBreakGlass) {
    try {
      await ensureBreakGlassShadowPrivilegesOnce();
    } catch {
      // Recovery session still authenticates; Access Control RPCs need the grant.
    }
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
