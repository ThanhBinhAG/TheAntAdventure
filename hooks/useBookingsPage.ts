'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import type { Booking } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<BookingListItem[]>>();

async function fetchBookingsOnce(bust = false): Promise<BookingListItem[]> {
  const key = '/api/bookings';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<BookingListItem>(
    key,
    'Không thể tải danh sách booking.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useBookingsPage() {
  const setBookings = useStore((s) => s.setBookings);
  const [items, setItems] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: BookingListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setBookings(rows as Booking[]);
      });
      setItems(rows);
    },
    [setBookings],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBookingsOnce(true);
      await applyRows(rows);
      setLoading(false);
      setError(null);
      return rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyRows]);

  useEffect(() => {
    let active = true;

    async function loadBookings() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchBookingsOnce();
        if (!active) return;
        await applyRows(rows);
        if (active) {
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    void loadBookings();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { items, loading, error, reload };
}
