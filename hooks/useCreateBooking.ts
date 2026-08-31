'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { BookingInput, BookingListItem } from '@/lib/bookings/booking-input';
import type { Booking } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type CreateBookingOutcome =
  | { ok: true; booking: BookingListItem }
  | { ok: false; error: 'save_failed'; message: string };

type CreateBookingResponse = {
  ok?: boolean;
  error?: string;
  data?: BookingListItem;
};

async function readJson(res: Response): Promise<CreateBookingResponse> {
  try {
    return (await res.json()) as CreateBookingResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useCreateBooking() {
  const addBooking = useStore((s) => s.addBooking);

  const createBooking = useCallback(
    async (booking: BookingInput): Promise<CreateBookingOutcome> => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo booking.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addBooking(body.data as Booking);
      });

      return { ok: true, booking: body.data };
    },
    [addBooking],
  );

  return { createBooking };
}
