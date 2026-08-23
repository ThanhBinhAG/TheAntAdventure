import { NextResponse, type NextRequest } from 'next/server';
import { CRM_SESSION_COOKIE, getCrmSession } from '@/lib/auth/crm-session';
import {
  isDebugRoute,
  isSystemDebugEnabled,
  verifyDebugRequest,
} from '@/lib/system/debug-config';
import { debugLog } from '@/lib/system/debug-logger';

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  redirectUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(redirectUrl);
}

/**
 * Proxy performs only the session check needed for navigation redirects.
 * Route Handlers still enforce authorization beside their data access.
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

  const session = await getCrmSession(request.cookies.get(CRM_SESSION_COOKIE)?.value);
  if (!session && !isLoginPage) {
    debugLog('middleware', 'Unauthenticated CRM session', { meta: { pathname } });
    return redirectToLogin(request);
  }

  if (session && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}
