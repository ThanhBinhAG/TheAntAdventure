'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { CalEventCreatePayload, CalEventListItem } from '@/lib/cal-events/cal-events-input';
import { useStore } from '@/hooks/useStore';

export type CreateCalEventOutcome =
  | { ok: true; event: CalEventListItem }
  | { ok: false; error: 'save_failed'; message: string };

type CreateCalEventResponse = {
  ok?: boolean;
  error?: string;
  data?: CalEventListItem;
};

async function readJson(res: Response): Promise<CreateCalEventResponse> {
  try {
    return (await res.json()) as CreateCalEventResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useCreateCalEvent() {
  const addCalEvent = useStore((s) => s.addCalEvent);
  const removeCalEvent = useStore((s) => s.removeCalEvent);

  const createCalEvent = useCallback(
    async (payload: CalEventCreatePayload): Promise<CreateCalEventOutcome> => {
      const optimisticId = `pending-${Date.now()}`;
      const optimistic: CalEventListItem = {
        id: optimisticId,
        guideId: payload.guideId,
        bookingCode: payload.bookingCode,
        tour: payload.tour,
        clients: payload.clients,
        start: payload.start,
        end: payload.end,
        status: payload.status || 'booked',
        notes: payload.notes,
      };

      await withoutAutoSyncAsync(async () => {
        addCalEvent(optimistic);
      });

      const res = await fetch('/api/cal-events', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: payload }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          removeCalEvent(optimisticId);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể lưu sự kiện lịch.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        removeCalEvent(optimisticId);
        addCalEvent(body.data as Record<string, unknown>);
      });

      return { ok: true, event: body.data };
    },
    [addCalEvent, removeCalEvent],
  );

  return { createCalEvent };
}
