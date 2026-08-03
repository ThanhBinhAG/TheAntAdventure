import { Suspense } from 'react';
import { isSystemDebugEnabled } from '@/lib/system/debug-config';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  const showDebugLink = isSystemDebugEnabled();

  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card">Đang tải…</div>
        </div>
      }
    >
      <LoginForm showDebugLink={showDebugLink} />
    </Suspense>
  );
}
