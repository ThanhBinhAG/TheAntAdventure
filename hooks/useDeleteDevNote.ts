'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { DevNoteListItem } from '@/lib/dev-notes/dev-notes-input';
import { useStore } from '@/hooks/useStore';

export type DeleteDevNoteOutcome =
  | { ok: true }
  | { ok: false; error: 'delete_failed'; message: string };

type DeleteDevNoteResponse = {
  ok?: boolean;
  error?: string;
};

async function readJson(res: Response): Promise<DeleteDevNoteResponse> {
  try {
    return (await res.json()) as DeleteDevNoteResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useDeleteDevNote() {
  const devNotes = useStore((s) => s.devNotes);
  const removeDevNote = useStore((s) => s.removeDevNote);
  const addDevNote = useStore((s) => s.addDevNote);

  const deleteDevNote = useCallback(
    async (id: string): Promise<DeleteDevNoteOutcome> => {
      const current = devNotes.find((n) => (n as DevNoteListItem).id === id) as DevNoteListItem | undefined;
      if (!current) {
        return {
          ok: false,
          error: 'delete_failed',
          message: 'Không tìm thấy ghi chú trên client.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        removeDevNote(id);
      });

      const res = await fetch(`/api/dev-notes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok) {
        await withoutAutoSyncAsync(async () => {
          addDevNote(current);
        });
        return {
          ok: false,
          error: 'delete_failed',
          message: body.error || 'Không thể xóa ghi chú.',
        };
      }

      return { ok: true };
    },
    [addDevNote, devNotes, removeDevNote],
  );

  return { deleteDevNote };
}
