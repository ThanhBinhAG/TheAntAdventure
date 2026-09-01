'use client';

import { useLanguage } from '@/hooks/useLanguage';

export function LoginLoading() {
  const { tp } = useLanguage();

  return (
    <div className="login-page">
      <div className="login-card">{tp('auth', 'loading')}</div>
    </div>
  );
}
