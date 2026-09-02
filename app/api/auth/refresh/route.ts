import { NextResponse } from 'next/server';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import {
  clearCrmSessionCookie,
  readCrmSessionToken,
  setCrmSessionCookie,
} from '@/lib/auth/crm-session-cookie';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';
import { hasTrustedRequestOrigin } from '@/lib/auth/request-origin';
import { consumeRefreshRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { recordAuthSecurityEvent } from '@/lib/auth/security-audit';
import { createSupabaseAuthClient } from '@/lib/auth/supabase-auth-server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

function clearRefreshCredentials(response: NextResponse, cookieHeader: string | null): void {
  clearCrmSessionCookie(response);
  clearSupabaseAuthCookies(response, cookieHeader);
}

function isRejectedSupabaseSession(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) return false;
  const status = (error as { status?: unknown }).status;
  return status === 400 || status === 401 || status === 403;
}

function unauthenticatedResponse(request: Request, ip: string): NextResponse {
  const failure = NextResponse.json(
    { ok: false, error: 'Session has expired.' },
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

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/refresh', route: '/api/auth/refresh' },
  async (request, _context, { logger }) => {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Invalid origin.' }, { status: 403 });
  }

  const rate = await consumeRefreshRateLimit(getClientIp(request));
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many session refresh requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
    );
  }

  const response = NextResponse.json({ ok: true });
  const ip = getClientIp(request);
  let stage = 'create_client';
  try {
    const sessionToken = readCrmSessionToken(request.headers.get('cookie'));
    if (!sessionToken) return unauthenticatedResponse(request, ip);

    stage = 'lookup_crm_session';
    const repository = getCrmSessionRepository();
    const stored = await repository.lookup(sessionToken);
    if (!stored) return unauthenticatedResponse(request, ip);

    stage = 'refresh_supabase_session';
    const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
      refresh_token: stored.refreshToken,
    });
    const session = data.session;
    if (!session?.access_token || !session.refresh_token) {
      if (!error || isRejectedSupabaseSession(error)) {
        await repository.revoke(sessionToken);
        return unauthenticatedResponse(request, ip);
      }
      throw error;
    }

    stage = 'rotate_crm_session';
    await repository.rotateCredentials({
      id: stored.id,
      token: sessionToken,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      accessTokenExpiresAt: new Date((session.expires_at ?? Math.floor(Date.now() / 1000)) * 1000),
      expiresAt: stored.expiresAt,
    });
    setCrmSessionCookie(response, sessionToken, stored.expiresAt);
    clearSupabaseAuthCookies(response, request.headers.get('cookie'));
    void recordAuthSecurityEvent({ eventType: 'refresh_succeeded', ip });
    return response;
  } catch (error) {
    logger.warn(
      { event: 'auth.refresh_unavailable', stage, ...getSafeErrorDetails(error) },
      'Supabase session refresh temporarily unavailable',
    );
    const failure = NextResponse.json(
      { ok: false, error: 'Authentication service temporarily unavailable.' },
      { status: 503, headers: { 'Retry-After': '60' } },
    );
    void recordAuthSecurityEvent({ eventType: 'refresh_failed', ip });
    return failure;
  }
  },
);
