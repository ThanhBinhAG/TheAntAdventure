'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { Guide } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<Guide[]>>();

async function fetchGuidesOnce(bust = false): Promise<Guide[]> {
  const key = '/api/guides';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<Guide>(
    key,
    'Không thể tải danh sách hướng dẫn viên.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useGuidesPage() {
  const setGuides = useStore((s) => s.setGuides);
  const [guides, setGuidesLocal] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: Guide[]) => {
      await withoutAutoSyncAsync(async () => {
        setGuides(rows);
      });
      setGuidesLocal(rows);
    },
    [setGuides],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchGuidesOnce(true);
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

    async function loadGuides() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchGuidesOnce();
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

    void loadGuides();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { guides, loading, error, reload };
}
