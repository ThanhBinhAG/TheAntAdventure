'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffData } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { TaxListItem, TaxReportsResponse } from '@/lib/tax/tax-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<TaxReportsResponse>>();

function buildUrl(period: string): string {
  const qs = new URLSearchParams({ period });
  return `/api/tax-reports?${qs.toString()}`;
}

async function fetchTaxOnce(period: string, bust = false): Promise<TaxReportsResponse> {
  const key = buildUrl(period);
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffData<TaxReportsResponse>(
    key,
    'Không thể tải báo cáo thuế.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useTaxPage(period: string) {
  const setTax = useStore((s) => s.setTax);
  const [rows, setRows] = useState<TaxListItem[]>([]);
  const [ytd, setYtd] = useState<TaxListItem | undefined>();
  const [allPeriods, setAllPeriods] = useState<TaxListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyResponse = useCallback(
    async (data: TaxReportsResponse, mirrorAll: TaxListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setTax(mirrorAll);
      });
      setRows(data.rows);
      setYtd(data.ytd);
      if (mirrorAll.length) setAllPeriods(mirrorAll);
    },
    [setTax],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [current, all] = await Promise.all([
        fetchTaxOnce(period, true),
        period === 'all' ? Promise.resolve(null) : fetchTaxOnce('all', true),
      ]);
      const mirrorAll = all?.rows ?? current.rows;
      await applyResponse(current, mirrorAll);
      if (all?.rows) setAllPeriods(all.rows);
      setLoading(false);
      return current;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyResponse, period]);

  useEffect(() => {
    let active = true;

    async function loadTax() {
      setLoading(true);
      setError(null);
      try {
        const [current, all] = await Promise.all([
          fetchTaxOnce(period),
          period === 'all' ? Promise.resolve(null) : fetchTaxOnce('all'),
        ]);
        if (!active) return;
        const mirrorAll = all?.rows ?? current.rows;
        await applyResponse(current, mirrorAll);
        if (all?.rows) setAllPeriods(all.rows);
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

    void loadTax();

    return () => {
      active = false;
    };
  }, [applyResponse, period]);

  const displayRows =
    period === 'all' && ytd ? [...rows, ytd] : rows;

  return {
    rows: displayRows,
    allPeriods,
    loading,
    error,
    reload,
  };
}
