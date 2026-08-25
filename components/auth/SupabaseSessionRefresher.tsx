'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_CHECK_INTERVAL_MS = 4 * 60 * 1000;

/** Keeps the HttpOnly Supabase SSR session current while the CRM is open. */
export function SupabaseSessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    let refreshing = false;

    const refreshIfNeeded = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
        }
      } catch {
        // Keep the current token until its natural expiry; the next check retries.
      } finally {
        refreshing = false;
      }
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') void refreshIfNeeded();
    };

    void refreshIfNeeded();
    const timer = window.setInterval(() => void refreshIfNeeded(), REFRESH_CHECK_INTERVAL_MS);
    window.addEventListener('focus', refreshOnVisible);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnVisible);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [router]);

  return null;
}
