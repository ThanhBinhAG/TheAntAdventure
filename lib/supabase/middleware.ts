import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getBreakGlassAuthFromRequest, setBreakGlassCookie } from '@/lib/auth/break-glass';
import {
  isDebugRoute,
  isSystemDebugEnabled,
  verifyDebugRequest,
} from '@/lib/system/debug-config';
import { debugLog } from '@/lib/system/debug-logger';

function applyBreakGlassRefresh(
  response: NextResponse,
  refresh?: { token: string; maxAge: number },
) {
  if (refresh) setBreakGlassCookie(response, refresh.token, refresh.maxAge);
  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';

  // Public liveness / readiness for nginx & uptime monitors.
  if (pathname === '/api/health') {
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

  // Allow unauthenticated access to auth API routes (login/logout).
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
    return NextResponse.next({ request });
  }

  const bg = await getBreakGlassAuthFromRequest(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      await supabase.auth.getUser();
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    debugLog('middleware', 'getUser failed', {
      level: 'error',
      meta: { pathname, error: userError.message },
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