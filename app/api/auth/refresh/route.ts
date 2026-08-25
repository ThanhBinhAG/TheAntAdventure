import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
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

/** tokens-only SSR sessions throw if you read session.user / session.id — use JWT `sub`. */
function userIdFromAccessToken(accessToken: string): string | null {
  try {
    const payload = decodeJwt(accessToken);
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
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

export async function POST(request: Request) {
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
  const { logger } = requestLogger(request, 'auth.refresh');
  try {
    const supabase = createSupabaseRouteClient(request, response);
    // getSession refreshes only when the token is near expiry, avoiding an
    // unnecessary refresh-token rotation for every active browser tab.
    const { data, error } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.access_token) {
      if (!error || isRejectedSupabaseSession(error)) {
        return unauthenticatedResponse(request, ip);
      }
      logger.warn({
        event: 'refresh_supabase_error',
        message: error instanceof Error ? error.message : 'unknown',
      });
      throw error;
    }

    // Do not read session.user / session.id — tokens-only cookie encoding throws
    // ("use getUser() instead") and was returning 503 on every proactive refresh.
    setSupabaseAccessCookie(response, {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
    });
    clearLegacyCrmAuthCookies(response);
    void recordAuthSecurityEvent({
      eventType: 'refresh_succeeded',
      userId: userIdFromAccessToken(session.access_token),
      ip,
    });
    return response;
  } catch (error) {
    logger.warn({
      event: 'refresh_unavailable',
      message: error instanceof Error ? error.message : 'unknown',
    });
    const failure = NextResponse.json(
      { ok: false, error: 'Dịch vụ xác thực tạm thời không khả dụng.' },
      { status: 503 },
    );
    void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
    return failure;
  }
}
