import { getBffArray } from '@/lib/bff/client';
import type { BookingListItem } from '@/lib/bookings/booking-input';

const CATALOG_URL = '/api/bookings';

/** One successful catalog GET per session unless `bust` forces refresh. */
let catalogSessionLoaded = false;

const inflight = new Map<string, Promise<BookingListItem[]>>();

export function isBookingsCatalogLoaded(): boolean {
  return catalogSessionLoaded;
}

/** Test-only reset for module session state. */
export function resetBookingsCatalogSessionForTests(): void {
  catalogSessionLoaded = false;
  inflight.clear();
}

/**
 * Deduped GET /api/bookings for Bookings list + Contracts booking picker.
 * Parallel callers (e.g. React Strict Mode) share one in-flight request.
 */
export async function fetchBookingsCatalogOnce(bust = false): Promise<BookingListItem[]> {
  if (bust) {
    inflight.delete(CATALOG_URL);
    catalogSessionLoaded = false;
  }

  const existing = inflight.get(CATALOG_URL);
  if (existing) return existing;

  const promise = getBffArray<BookingListItem>(
    CATALOG_URL,
    'Không thể tải danh sách booking.',
  )
    .then((rows) => {
      catalogSessionLoaded = true;
      return rows;
    })
    .finally(() => {
      inflight.delete(CATALOG_URL);
    });

  inflight.set(CATALOG_URL, promise);
  return promise;
}
