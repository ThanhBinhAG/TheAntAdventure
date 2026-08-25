'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSessionRefreshDelayMs,
  SESSION_REFRESH_INTERVAL_MS,
} from '@/lib/auth/refresh-backoff';
import {
  cancelSessionRefreshRequest,
  registerSessionRefreshRequest,
} from '@/lib/auth/refresh-request-control';

// Supabase starts proactive renewal 90 seconds before expiry. Checking every
// minute guarantees at least one check inside that window for 5- and 15-minute JWTs.

/** Keeps the HttpOnly Supabase SSR session current while the CRM is open. */
export function SupabaseSessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    let refreshing = false;
    let failedAttempts = 0;
    let timer: number | undefined;

    const schedule = (delay: number) => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void refreshIfNeeded(), delay);
    };

    const refreshIfNeeded = async () => {
      if (refreshing) return;
      if (document.visibilityState === 'hidden') {
        schedule(SESSION_REFRESH_INTERVAL_MS);
        return;
      }
      refreshing = true;
      const controller = new AbortController();
      const unregisterRequest = registerSessionRefreshRequest(controller);
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace('/login');
          router.refresh();
          return;
        }
        if (!response.ok) {
          failedAttempts += 1;
          const retryAfter = Number(response.headers.get('retry-after'));
          schedule(getSessionRefreshDelayMs(failedAttempts, retryAfter));
          return;
        }
        failedAttempts = 0;
        schedule(SESSION_REFRESH_INTERVAL_MS);
      } catch {
        if (controller.signal.aborted) return;
        failedAttempts += 1;
        schedule(getSessionRefreshDelayMs(failedAttempts));
      } finally {
        unregisterRequest();
        refreshing = false;
      }
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        if (timer !== undefined) window.clearTimeout(timer);
        void refreshIfNeeded();
      }
    };

    void refreshIfNeeded();
    window.addEventListener('focus', refreshOnVisible);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      cancelSessionRefreshRequest();
      window.removeEventListener('focus', refreshOnVisible);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [router]);

  return null;
}
