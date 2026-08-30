'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffData } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { FinanceBundleResponse } from '@/lib/finance/finance-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<FinanceBundleResponse>>();

async function fetchFinanceOnce(bust = false): Promise<FinanceBundleResponse> {
  const key = '/api/finance';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffData<FinanceBundleResponse>(
    key,
    'Không thể tải dữ liệu tài chính.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useFinancePage() {
  const setFinance = useStore((s) => s.setFinance);
  const setAr = useStore((s) => s.setAr);
  const setAp = useStore((s) => s.setAp);
  const [bundle, setBundle] = useState<FinanceBundleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyBundle = useCallback(
    async (data: FinanceBundleResponse) => {
      await withoutAutoSyncAsync(async () => {
        setFinance(data.finance);
        setAr(data.ar);
        setAp(data.ap);
      });
      setBundle(data);
    },
    [setAp, setAr, setFinance],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFinanceOnce(true);
      await applyBundle(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyBundle]);

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFinanceOnce();
        if (!active) return;
        await applyBundle(data);
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

    void loadFinance();

    return () => {
      active = false;
    };
  }, [applyBundle]);

  return {
    finance: bundle?.finance ?? [],
    ar: bundle?.ar ?? [],
    ap: bundle?.ap ?? [],
    loading,
    error,
    reload,
  };
}
