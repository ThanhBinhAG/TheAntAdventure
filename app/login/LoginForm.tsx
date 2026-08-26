'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { getAuthCaptchaSiteKey } from '@/lib/env';

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
      setError('Please complete the CAPTCHA.');
      return;
    }

    setLoading(true);
    const trimmed = identity.trim();

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
        const msg = authErrorMessage(data.error || 'Login failed.');
        setError(msg);
        setCaptchaToken(null);
        return;
      }

      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      // A full navigation avoids a prefetched unauthenticated CRM response after the cookie changes.
      window.location.assign(safeNext);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Login failed.';
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
          <div className="login-subtitle">CRM — Login</div>
        </div>

        <form
          className={`login-form${loading ? ' is-busy' : ''}`}
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <label className="login-label" htmlFor="login-identity">
            Email
          </label>
          <input
            id="login-identity"
            type="text"
            inputMode="text"
            autoComplete="username"
            required
            disabled={loading}
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="email@example.com"
          />

          <label className="login-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {captchaRequired && (
            <TurnstileWidget siteKey={captchaSiteKey} onToken={handleCaptchaToken} />
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            className={`btn btn-p login-submit${loading ? ' is-loading' : ''}`}
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
            aria-live="polite"
          >
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden="true">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                Logging in…
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="login-hint">Account is assigned by administrator. No public registration.</p>

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
