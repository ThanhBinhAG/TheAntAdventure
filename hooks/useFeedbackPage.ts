'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { FeedbackListItem } from '@/lib/feedback/feedback-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<FeedbackListItem[]>>();

async function fetchFeedbackOnce(bust = false): Promise<FeedbackListItem[]> {
  const key = '/api/feedback';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<FeedbackListItem>(
    key,
    'Không thể tải danh sách feedback.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useFeedbackPage() {
  const setFeedback = useStore((s) => s.setFeedback);
  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: FeedbackListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setFeedback(rows);
      });
      setItems(rows);
    },
    [setFeedback],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchFeedbackOnce(true);
      await applyRows(rows);
      setLoading(false);
      setError(null);
      return rows;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyRows]);

  useEffect(() => {
    let active = true;

    async function loadFeedback() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchFeedbackOnce();
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

    void loadFeedback();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { items, loading, error, reload };
}
