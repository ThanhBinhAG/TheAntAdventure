'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { DevNoteListItem, DevNoteUpdateInput } from '@/lib/dev-notes/dev-notes-input';
import { useStore } from '@/hooks/useStore';

export type UpdateDevNoteOutcome =
  | { ok: true; note: DevNoteListItem }
  | { ok: false; error: 'save_failed'; message: string };

type UpdateDevNoteResponse = {
  ok?: boolean;
  error?: string;
  data?: DevNoteListItem;
};

async function readJson(res: Response): Promise<UpdateDevNoteResponse> {
  try {
    return (await res.json()) as UpdateDevNoteResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useUpdateDevNote() {
  const devNotes = useStore((s) => s.devNotes);
  const updateDevNote = useStore((s) => s.updateDevNote);

  const patchDevNote = useCallback(
    async (id: string, patch: DevNoteUpdateInput): Promise<UpdateDevNoteOutcome> => {
      const current = devNotes.find((n) => (n as DevNoteListItem).id === id) as DevNoteListItem | undefined;
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy ghi chú trên client.',
        };
      }

      const previous = { ...current };

      await withoutAutoSyncAsync(async () => {
        updateDevNote(id, patch);
      });

      const res = await fetch(`/api/dev-notes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: patch }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          updateDevNote(id, previous);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật ghi chú.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateDevNote(id, body.data as Record<string, unknown>);
      });

      return { ok: true, note: body.data };
    },
    [devNotes, updateDevNote],
  );

  return { patchDevNote };
}
