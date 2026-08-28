import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/session', route: '/api/auth/session' },
  async (_request, _context, { logger }) => {
    const auth = await getAuthContext();
    if (auth.authenticationUnavailable) {
      logger.warn({ event: 'auth.session.unavailable', statusCode: 503 }, 'CRM session unavailable');
      return NextResponse.json(
        { ok: false, error: 'Dịch vụ xác thực tạm thời không khả dụng.' },
        { status: 503, headers: { 'Retry-After': '30' } },
      );
    }
    if (!auth.authenticated) {
      return NextResponse.json({ ok: false, error: 'Phiên đăng nhập đã hết hạn.' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  },
);
