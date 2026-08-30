'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import {
  fetchBookingsCatalogOnce,
  isBookingsCatalogLoaded,
} from '@/lib/bookings/booking-catalog-fetch';
import type { Booking } from '@/lib/types';

/**
 * Bookings catalog in Zustand via CRM BFF (no PostgREST).
 * Used by Contracts booking picker after contracts page boot no longer hydrates bookings.
 */
export function useEnsureBookingsCatalogLoaded() {
  const setBookings = useStore((s) => s.setBookings);

  const reloadCatalog = useCallback(async () => {
    try {
      const rows = await fetchBookingsCatalogOnce(true);
      await withoutAutoSyncAsync(async () => {
        setBookings(rows as Booking[]);
      });
    } catch {
      // Picker stays empty; Contracts page still works for manual entry.
    }
  }, [setBookings]);

  const ensureCatalog = useCallback(async () => {
    if (isBookingsCatalogLoaded()) return;
    try {
      const rows = await fetchBookingsCatalogOnce();
      await withoutAutoSyncAsync(async () => {
        setBookings(rows as Booking[]);
      });
    } catch {
      // Picker stays empty; Contracts page still works for manual entry.
    }
  }, [setBookings]);

  return { ensureCatalog, reloadCatalog };
}
