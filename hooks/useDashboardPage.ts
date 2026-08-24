'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardFilters } from '@/lib/dashboard/dashboard-metrics';
import type { DashboardPageResponse } from '@/lib/dashboard/dashboard-types';

const inflight = new Map<string, Promise<DashboardPageResponse>>();

function filterKey(filters: DashboardFilters): string {
  return `${filters.clientType || 'all'}|${filters.market.trim() || 'all'}`;
}

function buildUrl(filters: DashboardFilters): string {
  const qs = new URLSearchParams();
  if (filters.clientType) qs.set('clientType', filters.clientType);
  if (filters.market.trim()) qs.set('market', filters.market.trim());
  const q = qs.toString();
  return q ? `/api/dashboard?${q}` : '/api/dashboard';
}

async function fetchDashboardOnce(
  filters: DashboardFilters,
): Promise<DashboardPageResponse> {
  const key = filterKey(filters);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(buildUrl(filters), { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || `Dashboard fetch failed (${res.status})`);
    }
    return json as DashboardPageResponse;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useDashboardPage(filters: DashboardFilters) {
  const [data, setData] = useState<DashboardPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const key = filterKey(filters);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (next: DashboardFilters) => {
    if (mounted.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const payload = await fetchDashboardOnce(next);
      if (mounted.current) {
        setData(payload);
        setLoading(false);
        setError(null);
      }
      return payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mounted.current) {
        setError(message);
        setLoading(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await fetchDashboardOnce(filters);
        if (!cancelled && mounted.current) {
          setData(payload);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled && mounted.current) {
          setError(message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally key-driven so object identity churn does not double-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey string
  }, [key]);

  const reload = useCallback(() => load(filters), [load, filters]);

  return { data, loading, error, reload };
}
