'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { HrStaffListItem } from '@/lib/hr/hr-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<HrStaffListItem[]>>();

async function fetchHrOnce(bust = false): Promise<HrStaffListItem[]> {
  const key = '/api/hr';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<HrStaffListItem>(
    key,
    'Không thể tải danh sách nhân sự.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useHrPage() {
  const setStaff = useStore((s) => s.setStaff);
  const [staff, setStaffLocal] = useState<HrStaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: HrStaffListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setStaff(rows);
      });
      setStaffLocal(rows);
    },
    [setStaff],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchHrOnce(true);
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

    async function loadHr() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchHrOnce();
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

    void loadHr();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { staff, loading, error, reload };
}
