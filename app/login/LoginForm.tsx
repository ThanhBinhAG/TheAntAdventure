'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { getAuthCaptchaSiteKey } from '@/lib/env';

function logAuthEvent(message: string, meta?: Record<string, unknown>, level: 'info' | 'warn' | 'error' = 'info') {
  void fetch('/api/system/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'auth', message, level, meta }),
  }).catch(() => { });
}

function authErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('err_ssl') ||
    lower.includes('ssl') ||
    lower.includes('certificate')
  ) {
    return 'Không kết nối được máy chủ xác thực — có thể do SSL, mạng, hoặc firewall. Liên hệ quản trị viên.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('email hoặc mật khẩu') || lower.includes('tài khoản hoặc mật khẩu')) {
    return 'Tài khoản hoặc mật khẩu không đúng.';
  }
  if (lower.includes('email not confirmed') || lower.includes('chưa được xác nhận')) {
    return 'Email chưa được xác nhận. Kiểm tra hộp thư hoặc liên hệ quản trị viên.';
  }
  if (lower.includes('captcha')) {
    return 'Xác minh CAPTCHA thất bại. Vui lòng thử lại.';
  }
  if (lower.includes('quá nhiều')) {
    return message;
  }
  return message || 'Đăng nhập thất bại. Vui lòng thử lại.';
}

type LoginFormProps = {
  showDebugLink?: boolean;
};

export function LoginForm({ showDebugLink = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const captchaSiteKey = getAuthCaptchaSiteKey();
  const captchaRequired = Boolean(captchaSiteKey);

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (captchaRequired && !captchaToken) {
      setError('Vui lòng hoàn thành xác minh CAPTCHA.');
      return;
    }

    setLoading(true);
    const trimmed = identity.trim();
    // Do not log raw identity when it might be break-glass username.
    logAuthEvent('signIn attempt', {
      hasAt: trimmed.includes('@'),
    });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: trimmed,
          password,
          captchaToken: captchaToken || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mode?: string;
      };

      if (!res.ok || !data.ok) {
        const msg = authErrorMessage(data.error || 'Đăng nhập thất bại.');
        logAuthEvent(
          'signIn failed',
          { status: res.status, mode: data.mode },
          'error',
        );
        setError(msg);
        setCaptchaToken(null);
        return;
      }

      logAuthEvent('signIn success', {
        mode: data.mode === 'break_glass' ? 'break_glass' : 'supabase',
      });
      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
      logAuthEvent('signIn exception', { error: raw }, 'error');
      setError(authErrorMessage(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-title">The Ant Adventures</div>
          <div className="login-subtitle">CRM — Đăng nhập</div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-label" htmlFor="login-identity">
            Email
          </label>
          <input
            id="login-identity"
            type="text"
            inputMode="text"
            autoComplete="username"
            required
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="email@example.com"
          />

          <label className="login-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {captchaRequired && (
            <TurnstileWidget siteKey={captchaSiteKey} onToken={handleCaptchaToken} />
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            className="btn btn-p login-submit"
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="login-hint">Tài khoản do quản trị viên cấp. Không có đăng ký công khai.</p>

        {showDebugLink && (
          <p className="login-hint debug-login-link">
            Admin:{' '}
            <Link href="/system/debug">System diagnostics</Link>
          </p>
        )}
      </div>
    </div>
  );
}
