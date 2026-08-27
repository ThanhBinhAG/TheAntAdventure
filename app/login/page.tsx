import { Suspense } from 'react';
import { connection } from 'next/server';
import { isSystemDebugEnabled } from '@/lib/system/debug-config';
import { getAuthCaptchaSiteKey } from '@/lib/server/env/app';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  await connection();
  const showDebugLink = isSystemDebugEnabled();
  const captchaSiteKey = getAuthCaptchaSiteKey();

  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card">Đang tải…</div>
        </div>
      }
    >
      <LoginForm showDebugLink={showDebugLink} captchaSiteKey={captchaSiteKey} />
    </Suspense>
  );
}
