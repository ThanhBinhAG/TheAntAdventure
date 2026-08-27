import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { SUPABASE_ACCESS_COOKIE } from '@/lib/auth/supabase-cookie-names';

export { SUPABASE_ACCESS_COOKIE } from '@/lib/auth/supabase-cookie-names';

function getCookieOptions(options: object) {
  return {
    ...options,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

function accessCookieOptions(maxAge: number) {
  return getCookieOptions({ maxAge });
}

function requireSupabaseAuthConfig() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error('Supabase Auth chưa được cấu hình ở phía server.');
  }
  return { url, key };
}

/**
 * Reads the raw Cookie header without constructing another NextRequest. Route
 * Handler requests may be framework-wrapped, and re-wrapping one makes the
 * native Request private state inaccessible.
 */
function readRequestCookies(request: Request): Map<string, string> {
  const cookies = new Map<string, string>();
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return cookies;

  for (const entry of cookieHeader.split(';')) {
    const separator = entry.indexOf('=');
    if (separator <= 0) continue;

    const name = entry.slice(0, separator).trim();
    if (!name) continue;
    cookies.set(name, entry.slice(separator + 1).trim());
  }
  return cookies;
}

/**
 * Server-only Supabase SSR client for a Route Handler that may update auth
 * cookies. Tokens remain HttpOnly and are never returned in a JSON response.
 */
export function createSupabaseRouteClient(request: Request, response: NextResponse) {
  const { url, key } = requireSupabaseAuthConfig();
  const cookieState = readRequestCookies(request);

  return createServerClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookies: {
      encode: 'tokens-only',
      getAll: () => Array.from(cookieState, ([name, value]) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        for (const cookie of cookiesToSet) {
          cookieState.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, getCookieOptions(cookie.options));
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });
}

/** Token fields only — avoid reading session.user/id (throws with tokens-only SSR cookies). */
export type SupabaseAccessCookieSession = Pick<
  Session,
  'access_token' | 'expires_at' | 'expires_in'
>;

/** Mirror the Supabase-issued access JWT into a small server-only cookie for BFF verification. */
export function setSupabaseAccessCookie(
  response: NextResponse,
  session: SupabaseAccessCookieSession,
): void {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = Math.max(1, (session.expires_at ?? now + (session.expires_in ?? 0)) - now);
  response.cookies.set(SUPABASE_ACCESS_COOKIE, session.access_token, accessCookieOptions(maxAge));
}

export function clearSupabaseAccessCookie(response: NextResponse): void {
  response.cookies.set(SUPABASE_ACCESS_COOKIE, '', accessCookieOptions(0));
}

/** Clears cookies from retired CRM-owned session implementations during migration. */
export function clearLegacyCrmAuthCookies(response: NextResponse): void {
  for (const name of ['crm_session', 'crm_access', 'crm_supabase_access', 'bg_session']) {
    response.cookies.set(name, '', accessCookieOptions(0));
  }
}
