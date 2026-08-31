'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { SalaryStaffListItem } from '@/lib/salary/salary-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<SalaryStaffListItem[]>>();

async function fetchSalaryOnce(bust = false): Promise<SalaryStaffListItem[]> {
  const key = '/api/salary';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<SalaryStaffListItem>(
    key,
    'Không thể tải dữ liệu lương.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useSalaryPage() {
  const setStaff = useStore((s) => s.setStaff);
  const [staff, setStaffLocal] = useState<SalaryStaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: SalaryStaffListItem[]) => {
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
      const rows = await fetchSalaryOnce(true);
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

    async function loadSalary() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchSalaryOnce();
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

    void loadSalary();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { staff, loading, error, reload };
}
