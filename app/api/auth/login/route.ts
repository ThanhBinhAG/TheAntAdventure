import { NextResponse } from 'next/server';
import { checkBreakGlassCredentials } from '@/lib/auth/break-glass';
import { getBreakGlassSupabaseSession } from '@/lib/auth/break-glass-supabase';
import {
  createCrmSessionExpiry,
  setCrmSessionCookie,
} from '@/lib/auth/crm-session-cookie';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';
import { createSupabaseAuthClient } from '@/lib/auth/supabase-auth-server';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIp,
  recordLoginFailure,
} from '@/lib/auth/rate-limit';
import { getLoginClientMetadata } from '@/lib/auth/login-history';
import { recordSuccessfulLogin } from '@/lib/auth/login-history-store';
import { recordAuthSecurityEvent } from '@/lib/auth/security-audit';
import { hasTrustedRequestOrigin } from '@/lib/auth/request-origin';
import { debugLog } from '@/lib/system/debug-logger';
import { type HttpRequestLogger, withHttpRequestLogging } from '@/lib/system/server-logger';

type LoginBody = {
  identity?: string;
  password?: string;
  captchaToken?: string;
};

function fail(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

function isNetworkOrTlsAuthError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('fetch failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('ssl') ||
    lower.includes('tls') ||
    lower.includes('certificate') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound')
  );
}

function authConnectivityMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('econnrefused') || lower.includes('127.0.0.1') || lower.includes('localhost')) {
    return 'Cannot connect to Supabase (ECONNREFUSED). Local dev: run npx supabase start. Production: verify URL does not point to 127.0.0.1.';
  }
  return 'Cannot connect to Supabase Auth — check network, firewall, or TLS certificate on the server.';
}

function logLoginRejected(
  logger: HttpRequestLogger['logger'],
  statusCode: number,
  reason: string,
  authMethod?: 'password' | 'break_glass',
): void {
  logger.warn(
    {
      event: 'auth.login.rejected',
      statusCode,
      reason,
      ...(authMethod ? { authMethod } : {}),
    },
    'Login rejected',
  );
}

async function createDurableSession(response: NextResponse, input: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number | undefined;
}): Promise<void> {
  const expiresAt = createCrmSessionExpiry();
  const accessTokenExpiresAt = new Date((input.accessTokenExpiresAt ?? Math.floor(Date.now() / 1000)) * 1000);
  const repository = getCrmSessionRepository();
  const session = await repository.create({
    userId: input.userId,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    accessTokenExpiresAt,
    expiresAt,
  });
  setCrmSessionCookie(response, session.token, expiresAt);
  void repository.cleanupExpired().catch(() => {});
}

/**
 * Audit must not cause login to fail.
 *
 * Do not log IP, User-Agent, or database errors to the browser/server console
 * to avoid accidentally leaking user tracking data.
 */
async function recordSuccessfulLoginSafely(input: {
  userId: string | null;
  authMethod: 'password' | 'break_glass';
  request: Request;
  logger: HttpRequestLogger['logger'];
}): Promise<void> {
  try {
    await recordSuccessfulLogin({
      userId: input.userId,
      authMethod: input.authMethod,
      metadata: getLoginClientMetadata(input.request),
    });
  } catch (err) {
    input.logger.warn(
      { event: 'auth_login_history.write_failed', authMethod: input.authMethod, err },
      'Login history write failed'
    );
  }
}

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/login', route: '/api/auth/login' },
  async (request, _context, { logger }) => {
  if (!hasTrustedRequestOrigin(request)) {
    logLoginRejected(logger, 403, 'origin_invalid');
    return fail(403, 'Invalid origin.');
  }

  const ip = getClientIp(request);
  const rate = await checkLoginRateLimit(ip);
  if (!rate.ok) {
    logLoginRejected(logger, 429, 'rate_limited');
    return fail(429, 'Too many failed login attempts. Try again in 1 minute.', {
      'Retry-After': String(rate.retryAfterSec),
    });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    logLoginRejected(logger, 400, 'invalid_body');
    return fail(400, 'Invalid request body.');
  }

  const identity = (body.identity ?? '').trim();
  const password = body.password ?? '';
  if (!identity || !password) {
    await recordLoginFailure(ip);
    logLoginRejected(logger, 400, 'missing_credentials');
    return fail(400, 'Please enter your account and password.');
  }

  // Break-glass first (timing-safe compare). Debug metadata is boolean-only and
  // emitted exclusively while SYSTEM_DEBUG is enabled; credentials are never logged.
  const breakGlass = checkBreakGlassCredentials(identity, password);
  debugLog('auth', 'break-glass credential check', {
    meta: {
      configured: breakGlass.configured,
      usernameMatches: breakGlass.usernameMatches,
      passwordMatches: breakGlass.passwordMatches,
    },
  });
  if (breakGlass.configured && breakGlass.usernameMatches && breakGlass.passwordMatches) {
    await clearLoginFailures(ip);
    try {
      const supabaseSession = await getBreakGlassSupabaseSession();
      if (!supabaseSession) {
        logger.error({ event: 'auth.break_glass_login_unavailable' }, 'Break-glass login unavailable');
        return fail(500, 'Break-glass session is not available.');
      }
      if (!supabaseSession.user?.id) {
        logger.error(
          { event: 'auth.break_glass_login_unavailable' },
          'Break-glass login unavailable',
        );
        return fail(503, 'Unable to create Supabase session. Please try again.');
      }
      const response = NextResponse.json({ ok: true, mode: 'break_glass' });
      await createDurableSession(response, {
        userId: supabaseSession.user.id,
        accessToken: supabaseSession.access_token,
        refreshToken: supabaseSession.refresh_token,
        accessTokenExpiresAt: supabaseSession.expires_at,
      });
      clearSupabaseAuthCookies(response, request.headers.get('cookie'));
      await recordSuccessfulLoginSafely({
        userId: supabaseSession.user.id,
        authMethod: 'break_glass',
        request,
        logger,
      });
      void recordAuthSecurityEvent({
        eventType: 'login_succeeded',
        userId: supabaseSession.user.id,
        ip,
      });
      logger.info({ event: 'auth.login.succeeded', authMethod: 'break_glass' }, 'Login succeeded');
      return response;
    } catch (error) {
      debugLog('auth', 'break-glass login failed', {
        level: 'error',
        meta: { message: error instanceof Error ? error.message : 'unknown' },
      });
      logger.error({ event: 'auth.break_glass_login_failed', err: error }, 'Break-glass login failed');
      return fail(500, 'Break-glass session is not available.');
    }
  }

  // Normal users must use email.
  if (!identity.includes('@')) {
    await recordLoginFailure(ip);
    logLoginRejected(logger, 401, 'identity_format', 'password');
    return fail(401, 'Invalid email or password.');
  }

  const response = NextResponse.json({ ok: true, mode: 'crm' });
  let supabase;
  try {
    supabase = createSupabaseAuthClient();
  } catch (error) {
    logger.error({ event: 'auth.supabase_client_create_failed', err: error }, 'Supabase Auth client creation failed');
    await recordLoginFailure(ip);
    return fail(503, 'Supabase Auth is not configured.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: identity,
    password,
    options: body.captchaToken ? { captchaToken: body.captchaToken } : undefined,
  });

  if (error) {
    await recordLoginFailure(ip);
    void recordAuthSecurityEvent({ eventType: 'login_failed', ip });
    const lower = error.message.toLowerCase();
    if (isNetworkOrTlsAuthError(error.message)) {
      logger.error({ event: 'auth.login.unavailable', authMethod: 'password', err: error }, 'Login unavailable');
      return fail(503, authConnectivityMessage(error.message));
    }
    let message = error.message || 'Login failed.';
    if (lower.includes('invalid login credentials')) {
      message = 'Invalid email or password.';
    } else if (lower.includes('email not confirmed')) {
      message = 'Email not confirmed. Check your inbox or contact an administrator.';
    } else if (lower.includes('captcha')) {
      message = 'CAPTCHA verification failed. Please try again.';
    }
    logLoginRejected(logger, 401, lower.includes('invalid login credentials')
      ? 'invalid_credentials'
      : lower.includes('email not confirmed')
        ? 'email_unconfirmed'
        : lower.includes('captcha')
          ? 'captcha_rejected'
          : 'authentication_rejected', 'password');
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }

  await clearLoginFailures(ip);

  if (!data.user || !data.session) {
    logLoginRejected(logger, 401, 'missing_session', 'password');
    return fail(401, 'Unable to create login session.');
  }

  try {
    await createDurableSession(response, {
      userId: data.user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      accessTokenExpiresAt: data.session.expires_at,
    });
  } catch (error) {
    logger.error({ event: 'auth.crm_session_create_failed', err: error }, 'CRM session creation failed');
    return fail(503, 'Session service temporarily unavailable.');
  }
  clearSupabaseAuthCookies(response, request.headers.get('cookie'));

  // Record login history in background to avoid blocking the response
  void recordSuccessfulLoginSafely({
    userId: data.user.id,
    authMethod: 'password',
    request,
    logger,
  });
  void recordAuthSecurityEvent({
    eventType: 'login_succeeded',
    userId: data.user.id,
    ip,
  });
  logger.info(
    { event: 'auth.login.succeeded', authMethod: 'password', actorId: data.user.id },
    'Login succeeded',
  );

  return response;
  },
);
