'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CrmError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="card" style={{ margin: 24, maxWidth: 560 }}>
      <div className="card-hd">
        <span className="card-title">Something went wrong</span>
      </div>
      <p style={{ margin: '12px 0', color: 'var(--mu)' }}>
        Trang CRM gặp lỗi không mong muốn. Bạn có thể thử lại hoặc quay về dashboard.
      </p>
      {error.digest && (
        <p className="login-hint" style={{ marginBottom: 12 }}>
          Ref: <code>{error.digest}</code>
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-p" type="button" onClick={() => reset()}>
          Try again
        </button>
        <a className="btn" href="/dashboard">
          Dashboard
        </a>
      </div>
    </div>
  );
}
