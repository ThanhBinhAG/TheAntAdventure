import { NextResponse } from 'next/server';
import { checkBreakGlassCredentials } from '@/lib/auth/break-glass';
import { getBreakGlassSupabaseSession } from '@/lib/auth/break-glass-supabase';
import {
  clearLegacyCrmAuthCookies,
  createSupabaseRouteClient,
  setSupabaseAccessCookie,
} from '@/lib/auth/supabase-ssr';
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
import { requestLogger } from '@/lib/system/server-logger';

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
    return 'Không kết nối được Supabase (ECONNREFUSED). Nếu đang dùng local: chạy npx supabase start. Nếu deploy: kiểm tra URL không còn trỏ 127.0.0.1.';
  }
  return 'Không kết nối được Supabase Auth — kiểm tra mạng, firewall, hoặc chứng chỉ TLS trên server.';
}

function logLoginRejected(
  logger: ReturnType<typeof requestLogger>['logger'],
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

/**
 * Audit không được làm thất bại đăng nhập.
 *
 * Không log IP, User-Agent hoặc lỗi database ra browser/server console để
 * tránh vô tình lộ dữ liệu truy vết của người dùng.
 */
async function recordSuccessfulLoginSafely(input: {
  userId: string | null;
  authMethod: 'password' | 'break_glass';
  request: Request;
  logger: ReturnType<typeof requestLogger>['logger'];
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

export async function POST(request: Request) {
  const { logger } = requestLogger(request, 'auth/login');
  if (!hasTrustedRequestOrigin(request)) {
    logLoginRejected(logger, 403, 'origin_invalid');
    return fail(403, 'Origin không hợp lệ.');
  }

  const ip = getClientIp(request);
  const rate = await checkLoginRateLimit(ip);
  if (!rate.ok) {
    logLoginRejected(logger, 429, 'rate_limited');
    return fail(429, 'Quá nhiều lần đăng nhập thất bại. Thử lại sau 1 phút.', {
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
    return fail(400, 'Vui lòng nhập tài khoản và mật khẩu.');
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
      const response = NextResponse.json({ ok: true, mode: 'break_glass' });
      const supabase = createSupabaseRouteClient(request, response);
      const { data, error } = await supabase.auth.setSession({
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
      });
      if (error || !data.session) {
        logger.error(
          { event: 'auth.break_glass_login_unavailable', err: error },
          'Break-glass login unavailable',
        );
        return fail(503, 'Không thể tạo Supabase session. Vui lòng thử lại.');
      }
      setSupabaseAccessCookie(response, data.session);
      clearLegacyCrmAuthCookies(response);
      await recordSuccessfulLoginSafely({
        userId: null,
        authMethod: 'break_glass',
        request,
        logger,
      });
      void recordAuthSecurityEvent({
        eventType: 'login_succeeded',
        // Route SSR uses tokens-only storage, where session.user can be an
        // intentionally unavailable proxy. The break-glass audit remains
        // useful without a user ID and must never break recovery login.
        userId: null,
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
    return fail(401, 'Tài khoản hoặc mật khẩu không đúng.');
  }

  const response = NextResponse.json({ ok: true, mode: 'crm' });
  let supabase;
  try {
    supabase = createSupabaseRouteClient(request, response);
  } catch (error) {
    logger.error({ event: 'auth.supabase_client_create_failed', err: error }, 'Supabase Auth client creation failed');
    await recordLoginFailure(ip);
    return fail(503, 'Supabase Auth chưa được cấu hình.');
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
    let message = error.message || 'Đăng nhập thất bại.';
    if (lower.includes('invalid login credentials')) {
      message = 'Tài khoản hoặc mật khẩu không đúng.';
    } else if (lower.includes('email not confirmed')) {
      message = 'Email chưa được xác nhận. Kiểm tra hộp thư hoặc liên hệ quản trị viên.';
    } else if (lower.includes('captcha')) {
      message = 'Xác minh CAPTCHA thất bại. Vui lòng thử lại.';
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
    return fail(401, 'Không thể tạo phiên đăng nhập.');
  }

  setSupabaseAccessCookie(response, data.session);
  clearLegacyCrmAuthCookies(response);

  // Chạy ngầm ghi lịch sử để không chặn luồng trả về kết quả cho người dùng
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
}
