import { NextResponse } from 'next/server';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import { clearCrmSessionCookie, readCrmSessionToken } from '@/lib/auth/crm-session-cookie';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';
import { getClientIp } from '@/lib/auth/rate-limit';
import { hasTrustedRequestOrigin } from '@/lib/auth/request-origin';
import { recordAuthSecurityEvent } from '@/lib/auth/security-audit';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

function clearBrowserCredentials(response: NextResponse, cookieHeader: string | null): void {
  clearCrmSessionCookie(response);
  clearSupabaseAuthCookies(response, cookieHeader);
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/logout', route: '/api/auth/logout' },
  async (request, _context, { logger }) => {
  if (!hasTrustedRequestOrigin(request)) {
    logger.warn({ event: 'auth.logout.origin_rejected', statusCode: 403 }, 'Logout origin rejected');
    return NextResponse.json({ ok: false, error: 'Origin không hợp lệ.' }, { status: 403 });
  }

  const cookieHeader = request.headers.get('cookie');
  const ip = getClientIp(request);
  const response = NextResponse.json({ ok: true });

  const sessionToken = readCrmSessionToken(cookieHeader);
  if (sessionToken) {
    try {
      await getCrmSessionRepository().revoke(sessionToken);
    } catch (error) {
      logger.error({ event: 'auth.logout.failed', err: error }, 'Logout failed');
      clearBrowserCredentials(response, cookieHeader);
      const failure = NextResponse.json(
        { ok: false, error: 'Dịch vụ session tạm thời không khả dụng. Vui lòng thử lại.' },
        { status: 503 },
      );
      copyCookies(response, failure);
      void recordAuthSecurityEvent({ eventType: 'logout_failed', ip });
      return failure;
    }
  }

  clearBrowserCredentials(response, cookieHeader);
  logger.info({ event: 'auth.logout.succeeded' }, 'Logout succeeded');
  void recordAuthSecurityEvent({ eventType: 'logout_succeeded', ip });
  return response;
  },
);
