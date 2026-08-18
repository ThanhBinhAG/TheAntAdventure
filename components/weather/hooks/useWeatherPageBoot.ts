'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DestinationWeatherDetail, WeatherDestinationMeta } from '@/lib/weather/types';
import type { WeatherRegion } from '@/lib/weather/coordinates';
import {
  clearClientWeatherCache,
  writeClientWeatherCache,
} from '@/lib/weather/client-cache';

export type ProvinceFormInput = {
  name: string;
  region: WeatherRegion;
  emoji?: string | null;
  latitude: number;
  longitude: number;
  elevationM?: number | null;
  description?: string | null;
  notes?: string | null;
  coverPhotoId?: string | null;
  isFeatured?: boolean;
};

type WeatherPageBootPayload = {
  destinations: WeatherDestinationMeta[];
  featuredWeather: DestinationWeatherDetail[];
};

let bootInflight: Promise<WeatherPageBootPayload> | null = null;

function seedFeaturedWeatherCache(featuredWeather: DestinationWeatherDetail[]): void {
  for (const detail of featuredWeather) {
    writeClientWeatherCache(detail);
  }
}

async function fetchWeatherPageBoot(options?: { force?: boolean }): Promise<WeatherPageBootPayload> {
  if (bootInflight && !options?.force) return bootInflight;

  bootInflight = (async () => {
    const res = await fetch('/api/weather/boot', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Boot failed (${res.status})`);
    const destinations = (json.destinations ?? []) as WeatherDestinationMeta[];
    const featuredWeather = (json.featuredWeather ?? []) as DestinationWeatherDetail[];
    seedFeaturedWeatherCache(featuredWeather);
    return { destinations, featuredWeather };
  })().finally(() => {
    bootInflight = null;
  });

  return bootInflight;
}

/**
 * Weather page boot: one request for catalog + featured forecasts.
 * Seeds localStorage so featured cards hit cache (no extra destination GETs).
 */
export function useWeatherPageBoot() {
  const [destinations, setDestinations] = useState<WeatherDestinationMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (mounted.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const boot = await fetchWeatherPageBoot({ force: true });
      if (mounted.current) {
        setDestinations(boot.destinations);
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (mounted.current) {
        setError(message);
        setLoading(false);
      }
    }
  }, []);

  // Initial boot: loading already true — only setState after await (no sync setState in effect).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const boot = await fetchWeatherPageBoot();
        if (!cancelled && mounted.current) {
          setDestinations(boot.destinations);
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
  }, []);

  const create = useCallback(
    async (input: ProvinceFormInput) => {
      const res = await fetch('/api/weather/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Create failed');
      await reload();
      return json.destination as WeatherDestinationMeta;
    },
    [reload]
  );

  const update = useCallback(
    async (id: string, patch: Partial<ProvinceFormInput>) => {
      const res = await fetch(`/api/weather/destinations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      clearClientWeatherCache(id);
      await reload();
      return json.destination as WeatherDestinationMeta;
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/weather/destinations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      clearClientWeatherCache(id);
      await reload();
    },
    [reload]
  );

  const setFeatured = useCallback(
    async (ids: string[]) => {
      const res = await fetch('/api/weather/destinations/featured', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Set featured failed');
      await reload();
    },
    [reload]
  );

  const featured = destinations.filter((d) => d.isFeatured);
  const explore = destinations.filter((d) => !d.isFeatured);

  return {
    destinations,
    featured,
    explore,
    loading,
    error,
    reload,
    create,
    update,
    remove,
    setFeatured,
  };
}
