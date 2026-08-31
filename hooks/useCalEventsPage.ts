'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { CalEventListItem } from '@/lib/cal-events/cal-events-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<CalEventListItem[]>>();

async function fetchCalEventsOnce(bust = false): Promise<CalEventListItem[]> {
  const key = '/api/cal-events';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<CalEventListItem>(
    key,
    'Không thể tải lịch hướng dẫn viên.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useCalEventsPage() {
  const setCalEvents = useStore((s) => s.setCalEvents);
  const [items, setItems] = useState<CalEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: CalEventListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setCalEvents(rows);
      });
      setItems(rows);
    },
    [setCalEvents],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCalEventsOnce(true);
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

    async function loadCalEvents() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchCalEventsOnce();
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

    void loadCalEvents();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { items, loading, error, reload };
}
