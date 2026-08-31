'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { BookingInput, BookingListItem } from '@/lib/bookings/booking-input';
import type { Booking } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type UpdateBookingOutcome =
  | { ok: true; booking: BookingListItem }
  | { ok: false; error: 'save_failed'; message: string };

type UpdateBookingResponse = {
  ok?: boolean;
  error?: string;
  data?: BookingListItem;
};

async function readJson(res: Response): Promise<UpdateBookingResponse> {
  try {
    return (await res.json()) as UpdateBookingResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useUpdateBooking() {
  const updateBooking = useStore((s) => s.updateBooking);
  const bookings = useStore((s) => s.bookings);

  const patchBooking = useCallback(
    async (
      bookingId: string,
      patch: Partial<Booking>,
    ): Promise<UpdateBookingOutcome> => {
      const current = bookings.find((b) => b.id === bookingId);
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy booking trên client.',
        };
      }

      const previous = { ...current };
      const merged: Booking = {
        ...current,
        ...patch,
        id: bookingId,
        changes: (patch.changes ?? current.changes) as Booking['changes'],
      };

      await withoutAutoSyncAsync(async () => {
        updateBooking(bookingId, patch);
      });

      const payload: BookingInput & { id: string } = {
        id: merged.id,
        custId: merged.custId,
        leadId: merged.leadId,
        tour: merged.tour,
        pax: merged.pax,
        start: merged.start,
        end: merged.end,
        total: merged.total,
        deposit: merged.deposit,
        status: merged.status,
        guide: merged.guide,
        hotel: merged.hotel,
        changes: (merged.changes ?? []) as BookingInput['changes'],
        guideAlertPending: merged.guideAlertPending,
      };

      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: payload }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          updateBooking(bookingId, previous);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật booking.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateBooking(bookingId, body.data as Partial<Booking>);
      });

      return { ok: true, booking: body.data };
    },
    [bookings, updateBooking],
  );

  return { patchBooking };
}
