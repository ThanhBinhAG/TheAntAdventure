'use client';

import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 8 * 60 * 1000;

/** Keeps the short-lived HttpOnly CRM access cookies fresh while the CRM is open. */
export function CrmAccessRefresher() {
  useEffect(() => {
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
      } catch {
        // The next protected request falls back to the durable session on Redis/network failure.
      } finally {
        inFlight = false;
      }
    };

    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
