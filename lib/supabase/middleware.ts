import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ACCESS_COOKIE } from '@/lib/auth/supabase-cookie-names';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import {
  isDebugRoute,
  isSystemDebugEnabled,
  verifyDebugRequest,
} from '@/lib/system/debug-config';
import { debugLog } from '@/lib/system/debug-logger';

function accessCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function setSupabaseAccessCookie(
  response: NextResponse,
  accessToken: string,
  expiresAt: number | undefined,
  expiresIn: number | undefined,
) {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = Math.max(1, (expiresAt ?? now + (expiresIn ?? 0)) - now);
  response.cookies.set(SUPABASE_ACCESS_COOKIE, accessToken, accessCookieOptions(maxAge));
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  redirectUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

/**
 * Proxy refreshes Supabase SSR cookies only for page navigation. BFF routes
 * verify the mirrored Supabase JWT themselves so API requests stay stateless.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';

  if (pathname === '/api/health' || pathname.startsWith('/api/')) {
    return NextResponse.next({ request });
  }

  if (isSystemDebugEnabled() && pathname === '/system/debug') {
    return NextResponse.next({ request });
  }

  if (isSystemDebugEnabled() && isDebugRoute(pathname)) {
    if (verifyDebugRequest(request)) return NextResponse.next({ request });
    return new NextResponse(null, { status: 404 });
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return isLoginPage ? NextResponse.next({ request }) : redirectToLogin(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
    cookies: {
      encode: 'tokens-only',
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }
        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, {
            ...cookie.options,
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  let claimsSubject: string | null = null;
  if (session) {
    const { data: claimsData } = await supabase.auth.getClaims(session.access_token);
    claimsSubject = typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null;
  }

  if (!session || !claimsSubject) {
    if (isLoginPage) return response;
    debugLog('middleware', 'Unauthenticated Supabase session', { meta: { pathname } });
    const redirect = redirectToLogin(request);
    redirect.cookies.set(SUPABASE_ACCESS_COOKIE, '', accessCookieOptions(0));
    return redirect;
  }

  if (request.cookies.get(SUPABASE_ACCESS_COOKIE)?.value !== session.access_token) {
    setSupabaseAccessCookie(
      response,
      session.access_token,
      session.expires_at,
      session.expires_in,
    );
  }

  if (isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    const redirect = NextResponse.redirect(redirectUrl);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
