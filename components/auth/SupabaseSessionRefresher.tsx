'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerSessionRefreshRequest } from '@/lib/auth/refresh-request-control';
import { createSessionRefreshController } from '@/lib/auth/session-refresh-controller';

// Supabase starts proactive renewal 90 seconds before expiry. Checking every
// minute guarantees at least one check inside that window for 5- and 15-minute JWTs.

/** Keeps the HttpOnly Supabase SSR session current while the CRM is open. */
export function SupabaseSessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    const refreshController = createSessionRefreshController({
      getVisibilityState: () => document.visibilityState === 'visible' ? 'visible' : 'hidden',
      registerRequest: registerSessionRefreshRequest,
      requestRefresh: async (signal) => {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          signal,
        });
        const retryAfter = Number(response.headers.get('retry-after'));
        return {
          status: response.status,
          ...(Number.isFinite(retryAfter) ? { retryAfterSeconds: retryAfter } : {}),
        };
      },
      onUnauthenticated: () => {
          router.replace('/login');
          router.refresh();
      },
    });

    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshController.refreshOnVisible();
      }
    };

    refreshController.start();
    window.addEventListener('focus', refreshOnVisible);
    document.addEventListener('visibilitychange', refreshOnVisible);
    return () => {
      refreshController.stop();
      window.removeEventListener('focus', refreshOnVisible);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, [router]);

  return null;
}
