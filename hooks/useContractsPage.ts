'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { ContractListItem } from '@/lib/contracts/contract-input';
import { useStore } from '@/hooks/useStore';

const inflight = new Map<string, Promise<ContractListItem[]>>();

async function fetchContractsOnce(bust = false): Promise<ContractListItem[]> {
  const key = '/api/contracts';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = getBffArray<ContractListItem>(
    key,
    'Không thể tải danh sách hợp đồng.',
  ).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useContractsPage() {
  const setContracts = useStore((s) => s.setContracts);
  const [items, setItems] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyRows = useCallback(
    async (rows: ContractListItem[]) => {
      await withoutAutoSyncAsync(async () => {
        setContracts(rows);
      });
      setItems(rows);
    },
    [setContracts],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchContractsOnce(true);
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

    async function loadContracts() {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchContractsOnce();
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

    void loadContracts();

    return () => {
      active = false;
    };
  }, [applyRows]);

  return { items, loading, error, reload };
}
