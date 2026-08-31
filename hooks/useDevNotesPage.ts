'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { DevNoteListItem } from '@/lib/dev-notes/dev-notes-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<DevNoteListItem[]>>();

async function fetchDevNotesOnce(bust = false): Promise<DevNoteListItem[]> {
  const key = '/api/dev-notes';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<DevNoteListItem>(
    key,
    'Không thể tải ghi chú phát triển.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useDevNotesPage() {
  const setDevNotes = useStore((s) => s.setDevNotes);
  const [items, setItems] = useState<DevNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: DevNoteListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setDevNotes(rows);
      });
      setItems(rows);
    },
    [setDevNotes],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchDevNotesOnce(true);
      await applyRows(rows);
      setLoading(false);
      return rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyRows]);

  useEffect(() => {
    let active = true;

    async function loadDevNotes() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchDevNotesOnce();
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

    void loadDevNotes();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { items, loading, error, reload };
}
