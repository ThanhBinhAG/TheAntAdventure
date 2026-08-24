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
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) throw error ?? new Error('Supabase session missing');

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
      { ok: false, error: 'Không thể làm mới session.' },
      { status: 401 },
    );
    clearRefreshCredentials(failure, request.headers.get('cookie'));
    void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
    return failure;
  }
}
