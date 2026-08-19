import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import {
  mintBreakGlassSession,
  setBreakGlassCookie,
  verifyBreakGlassCredentials,
} from '@/lib/auth/break-glass';
import { attachBreakGlassSupabaseSession } from '@/lib/auth/break-glass-supabase';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIp,
  recordLoginFailure,
} from '@/lib/auth/rate-limit';
import { getLoginClientMetadata } from '@/lib/auth/login-history';
import { recordSuccessfulLogin } from '@/lib/auth/login-history-store';
import { getSupabaseAnonKey, getSupabaseUrl, isBreakGlassConfigured } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

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
}): Promise<void> {
  try {
    await recordSuccessfulLogin({
      userId: input.userId,
      authMethod: input.authMethod,
      metadata: getLoginClientMetadata(input.request),
    });
  } catch {
    console.error('Không thể ghi lịch sử đăng nhập.');
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = await checkLoginRateLimit(ip);
  if (!rate.ok) {
    return fail(429, 'Quá nhiều lần đăng nhập thất bại. Thử lại sau.', {
      'Retry-After': String(rate.retryAfterSec),
    });
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return fail(400, 'Invalid request body.');
  }

  const identity = (body.identity ?? '').trim();
  const password = body.password ?? '';
  if (!identity || !password) {
    await recordLoginFailure(ip);
    return fail(400, 'Vui lòng nhập tài khoản và mật khẩu.');
  }

  // Break-glass first (timing-safe compare); never log the username.
  if (isBreakGlassConfigured() && verifyBreakGlassCredentials(identity, password)) {
    await clearLoginFailures(ip);
    try {
      const { token, maxAge } = await mintBreakGlassSession();
      const response = NextResponse.json({ ok: true, mode: 'break_glass' });
      setBreakGlassCookie(response, token, maxAge);
      // Best-effort Supabase session for RLS; bg_session alone still unlocks recovery APIs.
      await attachBreakGlassSupabaseSession(request, response);
      await recordSuccessfulLoginSafely({
        userId: null,
        authMethod: 'break_glass',
        request,
      });
      return response;
    } catch {
      return fail(500, 'Break-glass session is not available.');
    }
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    await recordLoginFailure(ip);
    return fail(503, 'Supabase Auth chưa được cấu hình.');
  }

  // Normal users must use email.
  if (!identity.includes('@')) {
    await recordLoginFailure(ip);
    return fail(401, 'Tài khoản hoặc mật khẩu không đúng.');
  }

  const response = NextResponse.json({ ok: true, mode: 'supabase' });
  const supabase = createServerClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    cookies: {
      getAll() {
        return request.headers
          .get('cookie')
          ?.split(';')
          .map((c) => {
            const [name, ...rest] = c.trim().split('=');
            return { name, value: rest.join('=') };
          })
          .filter((c) => c.name) ?? [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: identity,
    password,
    options: body.captchaToken ? { captchaToken: body.captchaToken } : undefined,
  });

  if (error) {
    await recordLoginFailure(ip);
    const lower = error.message.toLowerCase();
    if (isNetworkOrTlsAuthError(error.message)) {
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
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }

  await clearLoginFailures(ip);

  if (data.user) {
    // Chạy ngầm ghi lịch sử để không chặn luồng trả về kết quả cho người dùng
    void recordSuccessfulLoginSafely({
      userId: data.user.id,
      authMethod: 'password',
      request,
    });
  }

  return response;
}
