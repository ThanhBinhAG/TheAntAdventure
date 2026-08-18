import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  BG_SESSION_COOKIE,
  getBreakGlassAuthFromRequest,
  setBreakGlassCookie,
} from '@/lib/auth/break-glass';
import { isSupabaseAuthCookieName } from '@/lib/auth/cookie-hygiene';
import {
  isDebugRoute,
  isSystemDebugEnabled,
  verifyDebugRequest,
} from '@/lib/system/debug-config';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { isSupabaseTlsInsecureEnabled } from '@/lib/supabase/tls-config';
import { debugLog } from '@/lib/system/debug-logger';
import type { User } from '@supabase/supabase-js';

function applyBreakGlassRefresh(
  response: NextResponse,
  refresh?: { token: string; maxAge: number },
) {
  if (refresh) setBreakGlassCookie(response, refresh.token, refresh.maxAge);
  return response;
}

/** Edge-safe user resolve: avoid Auth network when TLS insecure (getSession from cookies). */
async function resolveMiddlewareUser(
  supabase: ReturnType<typeof createServerClient>,
): Promise<{ user: User | null; errorMessage?: string }> {
  if (isSupabaseTlsInsecureEnabled()) {
    const { data, error } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null, errorMessage: error?.message };
  }
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, errorMessage: error?.message };
}

function hasSessionCookieHint(request: NextRequest): boolean {
  if (request.cookies.get(BG_SESSION_COOKIE)?.value) return true;
  return request.cookies.getAll().some((c) => isSupabaseAuthCookieName(c.name));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';

  // Public liveness / readiness for nginx & uptime monitors.
  if (pathname === '/api/health') {
    return NextResponse.next({ request });
  }

  // Gallery chunk uploads: skip Auth getUser() RTT per 512KB chunk. Route still
  // enforces session via getAuthContext(). Keep full middleware for init/complete.
  if (
    request.method === 'POST' &&
    pathname === '/api/photos/upload/chunk' &&
    hasSessionCookieHint(request)
  ) {
    return NextResponse.next({ request });
  }

  if (isSystemDebugEnabled() && pathname === '/api/system/log' && request.method === 'POST') {
    return NextResponse.next({ request });
  }

  // Debug HTML page: allow when SYSTEM_DEBUG is on; token is entered in-UI and sent as header.
  if (isSystemDebugEnabled() && pathname === '/system/debug') {
    return NextResponse.next({ request });
  }

  if (isSystemDebugEnabled() && isDebugRoute(pathname)) {
    if (verifyDebugRequest(request)) {
      debugLog('middleware', 'Debug route allowed', { meta: { pathname } });
      return NextResponse.next({ request });
    }
    debugLog('middleware', 'Debug route denied — invalid token', {
      level: 'warn',
      meta: { pathname },
    });
    return new NextResponse(null, { status: 404 });
  }
  // Các route này tự kiểm tra session/quyền và phải trả JSON, không redirect
  // API request sang /login. In particular, Products checks products.read/write
  // in its Route Handlers, so resolving Auth here would duplicate that work.
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname === '/api/auth/permissions' ||
    pathname.startsWith('/api/access-control') ||
    pathname.startsWith('/api/products')
  ) {
    return NextResponse.next({ request });
  }

  const bg = await getBreakGlassAuthFromRequest(request);
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (bg.context) {
    if (isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      redirectUrl.search = '';
      return applyBreakGlassRefresh(NextResponse.redirect(redirectUrl), bg.refresh);
    }

    // Refresh Supabase cookies when present so RLS session stays alive.
    if (url && key) {
      let supabaseResponse = NextResponse.next({ request });
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      });
      await resolveMiddlewareUser(supabase);
      return applyBreakGlassRefresh(supabaseResponse, bg.refresh);
    }

    return applyBreakGlassRefresh(NextResponse.next({ request }), bg.refresh);
  }

  if (!url || !key) {
    debugLog('middleware', 'Missing Supabase env — redirect to login', {
      level: 'warn',
      meta: { pathname, hasUrl: Boolean(url), hasKey: Boolean(key) },
    });
    if (!isLoginPage) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { user, errorMessage } = await resolveMiddlewareUser(supabase);

  if (errorMessage) {
    debugLog('middleware', 'session resolve failed', {
      level: 'error',
      meta: { pathname, error: errorMessage },
    });
  }

  if (!user && !isLoginPage) {
    debugLog('middleware', 'Unauthenticated — redirect to login', {
      meta: { pathname },
    });
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    debugLog('middleware', 'Authenticated user on login — redirect to dashboard', {
      meta: { userId: user.id?.slice(0, 8) },
    });
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

/*Authentication Middleware*/
