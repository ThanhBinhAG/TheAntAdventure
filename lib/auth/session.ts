import 'server-only';
import { cookies } from 'next/headers';
import {
  ensureBreakGlassShadowPrivilegesOnce,
  isBreakGlassShadowEmail,
} from '@/lib/auth/break-glass-supabase';
import { getCurrentAuthzStateResult } from '@/lib/auth/authz-state';
import { CRM_SESSION_COOKIE } from '@/lib/auth/crm-session-cookie';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';
import { verifySupabaseAccessTokenResult } from '@/lib/auth/supabase-jwt';

export type AuthContext = {
  authenticated: boolean;
  isSuperAdmin: boolean;
  isBreakGlass: boolean;
  userId: string | null;
  email: string | null;
  /** JWT/Authz infrastructure is temporarily unavailable; this is not a logout. */
  authenticationUnavailable?: true;
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
  const sessionToken = cookieStore.get(CRM_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  let session;
  try {
    session = await getCrmSessionRepository().lookup(sessionToken);
  } catch {
    return {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
      authenticationUnavailable: true,
    };
  }
  if (!session) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  const verification = await verifySupabaseAccessTokenResult(session.accessToken);
  if (verification.status !== 'verified') {
    if (verification.status === 'unavailable') {
      return {
        authenticated: false,
        isSuperAdmin: false,
        isBreakGlass: false,
        userId: null,
        email: null,
        authenticationUnavailable: true,
      };
    }
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }
  const access = verification.access;
  if (access.userId !== session.userId) {
    return { authenticated: false, isSuperAdmin: false, isBreakGlass: false, userId: null, email: null };
  }

  const authz = await getCurrentAuthzStateResult({
    userId: access.userId,
    accessToken: session.accessToken,
  });
  if (authz.status === 'unavailable') {
    return {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
      authenticationUnavailable: true,
    };
  }
  if (authz.status === 'inactive') {
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
  verifiedAccessTokens.set(context, session.accessToken);
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
