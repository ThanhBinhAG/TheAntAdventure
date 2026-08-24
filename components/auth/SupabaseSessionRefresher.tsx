'use client';

import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 8 * 60 * 1000;

/** Keeps the HttpOnly Supabase SSR session current while the CRM is open. */
export function SupabaseSessionRefresher() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
