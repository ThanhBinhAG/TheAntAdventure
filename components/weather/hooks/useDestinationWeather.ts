'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DestinationWeatherDetail } from '@/lib/weather/types';
import {
  clearClientWeatherCache,
  readClientWeatherCache,
  writeClientWeatherCache,
} from '@/lib/weather/client-cache';

const inflight = new Map<string, Promise<DestinationWeatherDetail>>();

async function fetchDestinationWeather(
  id: string,
  force: boolean
): Promise<DestinationWeatherDetail> {
  const cacheKey = `${id}:${force ? 'force' : 'soft'}`;
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    if (!force) {
      const cached = readClientWeatherCache(id);
      if (cached) return cached;
    }

    const qs = new URLSearchParams({ id });
    if (force) qs.set('force', '1');
    const res = await fetch(`/api/weather/destination?${qs.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || `Weather fetch failed (${res.status})`);
    }
    const detail = json as DestinationWeatherDetail;
    writeClientWeatherCache(detail);
    return detail;
  })().finally(() => {
    inflight.delete(cacheKey);
  });

  inflight.set(cacheKey, promise);
  return promise;
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
    async (force = false) => {
      if (!id) return null;
      if (force) clearClientWeatherCache(id);

      if (!force) {
        const cached = readClientWeatherCache(id);
        if (cached) {
          if (mounted.current) {
            setData(cached);
            setError(null);
            setLoading(false);
          }
          return cached;
        }
      }

      if (mounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const detail = await fetchDestinationWeather(id, force);
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
        const detail = await fetchDestinationWeather(activeId, false);
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

  return {
    data,
    loading,
    error,
    refresh: () => load(true),
    reload: () => load(false),
  };
}
