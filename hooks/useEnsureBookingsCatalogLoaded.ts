'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import { getBffArray } from '@/lib/bff/client';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import type { Booking } from '@/lib/types';

/** One catalog GET per session unless `reloadCatalog` forces a refresh. */
let catalogSessionLoaded = false;

/**
 * Bookings catalog in Zustand via CRM BFF (no PostgREST).
 * Used by Contracts booking picker after contracts page boot no longer hydrates bookings.
 */
export function useEnsureBookingsCatalogLoaded() {
  const setBookings = useStore((s) => s.setBookings);

  const reloadCatalog = useCallback(async () => {
    try {
      const rows = await getBffArray<BookingListItem>(
        '/api/bookings',
        'Không thể tải danh sách booking.',
      );
      await withoutAutoSyncAsync(async () => {
        setBookings(rows as Booking[]);
      });
      catalogSessionLoaded = true;
    } catch {
      // Picker stays empty; Contracts page still works for manual entry.
    }
  }, [setBookings]);

  const ensureCatalog = useCallback(async () => {
    if (catalogSessionLoaded) return;
    await reloadCatalog();
  }, [reloadCatalog]);

  return { ensureCatalog, reloadCatalog };
}
