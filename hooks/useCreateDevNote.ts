'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { DevNoteCreatePayload, DevNoteListItem } from '@/lib/dev-notes/dev-notes-input';
import { useStore } from '@/hooks/useStore';

export type CreateDevNoteOutcome =
  | { ok: true; note: DevNoteListItem }
  | { ok: false; error: 'save_failed'; message: string };

type CreateDevNoteResponse = {
  ok?: boolean;
  error?: string;
  data?: DevNoteListItem;
};

async function readJson(res: Response): Promise<CreateDevNoteResponse> {
  try {
    return (await res.json()) as CreateDevNoteResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useCreateDevNote() {
  const addDevNote = useStore((s) => s.addDevNote);
  const removeDevNote = useStore((s) => s.removeDevNote);

  const createDevNote = useCallback(
    async (payload: DevNoteCreatePayload): Promise<CreateDevNoteOutcome> => {
      const optimisticId = `pending-${Date.now()}`;
      const optimistic: DevNoteListItem = {
        id: optimisticId,
        title: payload.title,
        body: payload.body,
        assignee: payload.assignee || 'Dev Team',
        priority: payload.priority || 'medium',
        category: payload.category || 'feature',
        status: 'open',
        date: new Date().toISOString().slice(0, 10),
      };

      await withoutAutoSyncAsync(async () => {
        addDevNote(optimistic);
      });

      const res = await fetch('/api/dev-notes', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: {
            title: payload.title,
            body: payload.body,
            assignee: payload.assignee,
            priority: payload.priority,
            category: payload.category,
            status: 'open',
          },
        }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          removeDevNote(optimisticId);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể lưu ghi chú.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        removeDevNote(optimisticId);
        addDevNote(body.data as Record<string, unknown>);
      });

      return { ok: true, note: body.data };
    },
    [addDevNote, removeDevNote],
  );

  return { createDevNote };
}
