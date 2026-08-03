'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#f6f4ef',
          color: '#1c1917',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          padding: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 12,
            padding: 24,
            maxWidth: 480,
            width: '100%',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>Application error</h1>
          <p style={{ margin: '0 0 16px', color: '#78716c', lineHeight: 1.5 }}>
            The Ant Adventures CRM failed to render. The error has been reported.
          </p>
          {error.digest && (
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#a8a29e' }}>
              Ref: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#166534',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
