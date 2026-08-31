'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { CalEventListItem } from '@/lib/cal-events/cal-events-input';
import { useStore } from '@/hooks/useStore';

export type DeleteCalEventOutcome =
  | { ok: true }
  | { ok: false; error: 'delete_failed'; message: string };

type DeleteCalEventResponse = {
  ok?: boolean;
  error?: string;
};

async function readJson(res: Response): Promise<DeleteCalEventResponse> {
  try {
    return (await res.json()) as DeleteCalEventResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useDeleteCalEvent() {
  const calEvents = useStore((s) => s.calEvents);
  const removeCalEvent = useStore((s) => s.removeCalEvent);
  const addCalEvent = useStore((s) => s.addCalEvent);

  const deleteCalEvent = useCallback(
    async (id: string): Promise<DeleteCalEventOutcome> => {
      const current = calEvents.find((e) => (e as CalEventListItem).id === id) as CalEventListItem | undefined;
      if (!current) {
        return {
          ok: false,
          error: 'delete_failed',
          message: 'Không tìm thấy sự kiện trên client.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        removeCalEvent(id);
      });

      const res = await fetch(`/api/cal-events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok) {
        await withoutAutoSyncAsync(async () => {
          addCalEvent(current);
        });
        return {
          ok: false,
          error: 'delete_failed',
          message: body.error || 'Không thể xóa sự kiện lịch.',
        };
      }

      return { ok: true };
    },
    [addCalEvent, calEvents, removeCalEvent],
  );

  return { deleteCalEvent };
}
