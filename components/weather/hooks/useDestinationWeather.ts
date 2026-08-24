'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DestinationWeatherDetail } from '@/lib/weather/types';
import {
  clearClientWeatherCache,
  readClientWeatherCache,
  writeClientWeatherCache,
} from '@/lib/weather/client-cache';

const inflight = new Map<string, Promise<DestinationWeatherDetail>>();

type FetchMode = 'soft' | 'refresh';

async function fetchSoftDestinationWeather(id: string): Promise<DestinationWeatherDetail> {
  const res = await fetch(`/api/weather/destination?id=${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Weather fetch failed (${res.status})`);

  const detail = json as DestinationWeatherDetail;
  writeClientWeatherCache(detail);
  return detail;
}

async function fetchRefreshDestinationWeather(id: string): Promise<DestinationWeatherDetail> {
  const res = await fetch('/api/weather/destination/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, force: true }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Weather refresh failed (${res.status})`);

  const detail = json.detail as DestinationWeatherDetail;
  writeClientWeatherCache(detail);
  return detail;
}

function cacheKey(id: string, mode: FetchMode) {
  return `${id}:${mode}`;
}

async function fetchWithDedupe(id: string, mode: FetchMode): Promise<DestinationWeatherDetail> {
  const key = cacheKey(id, mode);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    if (mode === 'soft') return await fetchSoftDestinationWeather(id);
    return await fetchRefreshDestinationWeather(id);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** Best-effort prefetch (hover/focus) — deduped via inflight map. */
export function prefetchDestinationWeather(id: string): void {
  if (readClientWeatherCache(id)) return;
  void fetchWithDedupe(id, 'soft').catch(() => {
    /* prefetch is best-effort */
  });
}

export function useDestinationWeather(
  id: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false && Boolean(id);
  const activeId = enabled && id ? id : null;

  const [data, setData] = useState<DestinationWeatherDetail | null>(() =>
    activeId ? readClientWeatherCache(activeId) : null
  );
  const [loading, setLoading] = useState(() =>
    Boolean(activeId && !readClientWeatherCache(activeId))
  );
  const [error, setError] = useState<string | null>(null);
  const [trackedId, setTrackedId] = useState(activeId);
  const mounted = useRef(true);

  // Adjust state when destination id / enabled flips (React “adjusting state when props change”).
  if (activeId !== trackedId) {
    setTrackedId(activeId);
    const cached = activeId ? readClientWeatherCache(activeId) : null;
    setData(cached);
    setLoading(Boolean(activeId && !cached));
    setError(null);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: FetchMode) => {
      if (!id) return null;

      if (mode === 'soft') {
        const cached = readClientWeatherCache(id);
        if (cached) {
          if (mounted.current) {
            setData(cached);
            setError(null);
            setLoading(false);
          }
          return cached;
        }
      } else {
        // Client cache can be stale; refresh clears it before forcing server update.
        clearClientWeatherCache(id);
      }

      if (mounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const detail = await fetchWithDedupe(id, mode);
        if (mounted.current) {
          setData(detail);
          setLoading(false);
        }
        return detail;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (mounted.current) {
          setError(message);
          setLoading(false);
        }
        return null;
      }
    },
    [id]
  );

  // Network fetch only — loading/reset already applied during render when id changes.
  useEffect(() => {
    if (!activeId) return;
    if (readClientWeatherCache(activeId)) return;

    let cancelled = false;
    void (async () => {
      try {
        const detail = await fetchWithDedupe(activeId, 'soft');
        if (!cancelled && mounted.current) {
          setData(detail);
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
  }, [activeId]);

  const refresh = useCallback(() => load('refresh'), [load]);
  const reload = useCallback(() => load('soft'), [load]);

  return {
    data,
    loading,
    error,
    refresh,
    reload,
  };
}
