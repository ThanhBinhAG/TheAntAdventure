import { NextResponse } from 'next/server';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import { hasTrustedRequestOrigin } from '@/lib/auth/request-origin';
import { consumeRefreshRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { recordAuthSecurityEvent } from '@/lib/auth/security-audit';
import {
  clearLegacyCrmAuthCookies,
  clearSupabaseAccessCookie,
  createSupabaseRouteClient,
  setSupabaseAccessCookie,
} from '@/lib/auth/supabase-ssr';
import { requestLogger } from '@/lib/system/server-logger';

function clearRefreshCredentials(response: NextResponse, cookieHeader: string | null): void {
  clearSupabaseAccessCookie(response);
  clearLegacyCrmAuthCookies(response);
  clearSupabaseAuthCookies(response, cookieHeader);
}

function isRejectedSupabaseSession(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) return false;
  const status = (error as { status?: unknown }).status;
  return status === 400 || status === 401 || status === 403;
}

function unauthenticatedResponse(request: Request, ip: string): NextResponse {
  const failure = NextResponse.json(
    { ok: false, error: 'Phiên đăng nhập đã hết hạn.' },
    { status: 401 },
  );
  clearRefreshCredentials(failure, request.headers.get('cookie'));
  void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
  return failure;
}

function getSafeErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return { errorName: 'unknown' };
  const candidate = error as { name?: unknown; status?: unknown; code?: unknown };
  return {
    errorName: typeof candidate.name === 'string' ? candidate.name : 'unknown',
    ...(typeof candidate.status === 'number' ? { status: candidate.status } : {}),
    ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
  };
}

export async function POST(request: Request) {
  const { logger, requestId } = requestLogger(request, 'auth/refresh');
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Origin không hợp lệ.' }, { status: 403 });
  }

  const rate = await consumeRefreshRateLimit(getClientIp(request));
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'Quá nhiều yêu cầu làm mới session. Vui lòng thử lại sau.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
    );
  }

  const response = NextResponse.json({ ok: true });
  const ip = getClientIp(request);
  let stage = 'create_client';
  try {
    const supabase = createSupabaseRouteClient(request, response);
    // getSession refreshes only when the token is near expiry, avoiding an
    // unnecessary refresh-token rotation for every active browser tab.
    stage = 'get_session';
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.access_token) {
      if (!error || isRejectedSupabaseSession(error)) {
        return unauthenticatedResponse(request, ip);
      }
      throw error;
    }

    stage = 'set_access_cookie';
    // `tokens-only` storage has no safe session.user/session.id. This helper
    // reads only access-token expiry fields, so proactive refresh cannot fail
    // because of the absent user object.
    setSupabaseAccessCookie(response, session);
    clearLegacyCrmAuthCookies(response);
    void recordAuthSecurityEvent({ eventType: 'refresh_succeeded', ip });
    return response;
  } catch (error) {
    logger.warn(
      { event: 'auth.refresh_unavailable', stage, ...getSafeErrorDetails(error) },
      'Supabase session refresh temporarily unavailable',
    );
    const failure = NextResponse.json(
      { ok: false, error: 'Dịch vụ xác thực tạm thời không khả dụng.' },
      { status: 503, headers: { 'Retry-After': '60', 'X-Request-Id': requestId } },
    );
    void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
    return failure;
  }
}
