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
import { getSupabaseAnonKey, getSupabaseUrl, isBreakGlassConfigured } from '@/lib/env';
import {
  getLoginClientMetadata,
} from '@/lib/auth/login-history';
import {
  recordSuccessfulLogin,
} from '@/lib/auth/login-history-store';


type LoginBody = {
  identity?: string;
  password?: string;
  captchaToken?: string;
};

function fail(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, error }, { status, headers });
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
  const rate = checkLoginRateLimit(ip);
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
    recordLoginFailure(ip);
    return fail(400, 'Vui lòng nhập tài khoản và mật khẩu.');
  }

  // Break-glass first (timing-safe compare); never log the username.
  if (isBreakGlassConfigured() && verifyBreakGlassCredentials(identity, password)) {
    clearLoginFailures(ip);
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
    recordLoginFailure(ip);
    return fail(503, 'Supabase Auth chưa được cấu hình.');
  }

  // Normal users must use email.
  if (!identity.includes('@')) {
    recordLoginFailure(ip);
    return fail(401, 'Tài khoản hoặc mật khẩu không đúng.');
  }

  const response = NextResponse.json({ ok: true, mode: 'supabase' });
  const supabase = createServerClient(url, key, {
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
    recordLoginFailure(ip);
    const lower = error.message.toLowerCase();
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

  clearLoginFailures(ip);

  if (data.user) {
    await recordSuccessfulLoginSafely({
      userId: data.user.id,
      authMethod: 'password',
      request,
    });
  }

  return response;
}
