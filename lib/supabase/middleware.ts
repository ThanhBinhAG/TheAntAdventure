import { NextResponse, type NextRequest } from 'next/server';
import {
  isDebugRoute,
  isSystemDebugEnabled,
  verifyDebugRequest,
} from '@/lib/system/debug-config';
import { debugLog } from '@/lib/system/debug-logger';

const CRM_SESSION_COOKIE = 'crm_session';

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  redirectUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

async function validateCrmSession(request: NextRequest): Promise<{ status: number; requestId: string | null }> {
  const validationUrl = new URL('/api/auth/session', request.url);
  try {
    const response = await fetch(validationUrl, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
    return { status: response.status, requestId: response.headers.get('X-Request-Id') };
  } catch {
    return { status: 503, requestId: null };
  }
}

function clearLegacySupabaseCookies(response: NextResponse, request: NextRequest): NextResponse {
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name === 'sb-crm-access-token'
      || (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'))
      || cookie.name === 'crm_access'
      || cookie.name === 'crm_supabase_access'
      || cookie.name === 'bg_session'
    ) {
      response.cookies.set(cookie.name, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    }
  }
  return response;
}

function clearInvalidCrmSession(response: NextResponse): NextResponse {
  response.cookies.set(CRM_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/** Proxy validates the CRM-owned opaque session without creating Supabase cookies. */
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

  if (!request.cookies.get(CRM_SESSION_COOKIE)?.value) {
    const response = isLoginPage ? NextResponse.next({ request }) : redirectToLogin(request);
    return clearLegacySupabaseCookies(response, request);
  }

  const validation = await validateCrmSession(request);
  if (validation.status === 503) {
    debugLog('middleware', 'CRM session validation temporarily unavailable', {
      level: 'warn',
      meta: { pathname },
    });
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Retry-After': '30',
        ...(validation.requestId ? { 'X-Request-Id': validation.requestId } : {}),
      },
    });
  }
  if (validation.status !== 200) {
    const response = isLoginPage ? NextResponse.next({ request }) : redirectToLogin(request);
    return clearLegacySupabaseCookies(clearInvalidCrmSession(response), request);
  }

  if (isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return clearLegacySupabaseCookies(NextResponse.redirect(redirectUrl), request);
  }

  return clearLegacySupabaseCookies(NextResponse.next({ request }), request);
}
