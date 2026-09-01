'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { useLanguage } from '@/hooks/useLanguage';

function authErrorMessage(
  message: string,
  tp: ReturnType<typeof useLanguage>['tp']
): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('err_ssl') ||
    lower.includes('ssl') ||
    lower.includes('certificate')
  ) {
    return tp('auth', 'errorNetwork');
  }
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('email hoặc mật khẩu') ||
    lower.includes('tài khoản hoặc mật khẩu')
  ) {
    return tp('auth', 'errorInvalidCredentials');
  }
  if (lower.includes('email not confirmed') || lower.includes('chưa được xác nhận')) {
    return tp('auth', 'errorEmailNotConfirmed');
  }
  if (lower.includes('captcha')) {
    return tp('auth', 'errorCaptchaFailed');
  }
  if (lower.includes('quá nhiều')) {
    return message;
  }
  return message || tp('auth', 'errorLoginFailed');
}

type LoginFormProps = {
  showDebugLink?: boolean;
  captchaSiteKey?: string;
};

export function LoginForm({ showDebugLink = false, captchaSiteKey = '' }: LoginFormProps) {
  const { tp } = useLanguage();
  const searchParams = useSearchParams();
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
      setError(tp('auth', 'captchaRequired'));
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
        const msg = authErrorMessage(data.error || tp('auth', 'errorLoginFailed'), tp);
        setError(msg);
        setCaptchaToken(null);
        return;
      }

      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      window.location.assign(safeNext);
    } catch (err) {
      const raw = err instanceof Error ? err.message : tp('auth', 'errorLoginFailed');
      setError(authErrorMessage(raw, tp));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-title">{tp('auth', 'brandTitle')}</div>
          <div className="login-subtitle">{tp('auth', 'brandSubtitle')}</div>
        </div>

        <form
          className={`login-form${loading ? ' is-busy' : ''}`}
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <label className="login-label" htmlFor="login-identity">
            {tp('auth', 'labelEmail')}
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
            placeholder={tp('auth', 'placeholderEmail')}
          />

          <label className="login-label" htmlFor="login-password">
            {tp('auth', 'labelPassword')}
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
                {tp('auth', 'submitLoggingIn')}
              </>
            ) : (
              tp('auth', 'submitLogin')
            )}
          </button>
        </form>

        <p className="login-hint">{tp('auth', 'hintNoRegistration')}</p>

        {showDebugLink && (
          <p className="login-hint debug-login-link">
            {tp('auth', 'hintAdminDebug')}{' '}
            <Link href="/system/debug">{tp('auth', 'linkSystemDiagnostics')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
