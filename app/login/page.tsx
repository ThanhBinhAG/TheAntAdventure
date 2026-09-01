import { Suspense } from 'react';
import { connection } from 'next/server';
import { isSystemDebugEnabled } from '@/lib/system/debug-config';
import { getAuthCaptchaSiteKey } from '@/lib/server/env/app';
import { LoginForm } from './LoginForm';
import { LoginLoading } from './LoginLoading';

export default async function LoginPage() {
  await connection();
  const showDebugLink = isSystemDebugEnabled();
  const captchaSiteKey = getAuthCaptchaSiteKey();

  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm showDebugLink={showDebugLink} captchaSiteKey={captchaSiteKey} />
    </Suspense>
  );
}
