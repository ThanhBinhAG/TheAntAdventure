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
  try {
    const supabase = createSupabaseRouteClient(request, response);
    // getSession refreshes only when the token is near expiry, avoiding an
    // unnecessary refresh-token rotation for every active browser tab.
    const { data, error } = await supabase.auth.getSession();
    if (!data.session) {
      if (!error || isRejectedSupabaseSession(error)) {
        return unauthenticatedResponse(request, ip);
      }
      throw error;
    }

    setSupabaseAccessCookie(response, data.session);
    clearLegacyCrmAuthCookies(response);
    void recordAuthSecurityEvent({
      eventType: 'refresh_succeeded',
      userId: data.session.user?.id ?? null,
      ip,
    });
    return response;
  } catch {
    const failure = NextResponse.json(
      { ok: false, error: 'Dịch vụ xác thực tạm thời không khả dụng.' },
      { status: 503 },
    );
    void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
    return failure;
  }
}
