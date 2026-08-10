import type { DestinationWeatherDetail } from '@/lib/weather/types';

const PREFIX = 'ant_weather_dest_v1:';

/** Cap localStorage weather entries (featured + recent explore). */
export const WEATHER_CLIENT_CACHE_MAX_KEYS = 8;

export type ClientWeatherCacheEntry = {
  fetchedAt: string;
  expiresAt: string;
  data: DestinationWeatherDetail;
};

function key(id: string): string {
  return `${PREFIX}${id}`;
}

function listWeatherKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  return keys;
}

/** Remove expired weather keys; returns remaining key → expiresAt (ms). */
function pruneExpiredWeatherKeys(now = Date.now()): Map<string, number> {
  const remaining = new Map<string, number>();
  for (const k of listWeatherKeys()) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) {
        localStorage.removeItem(k);
        continue;
      }
      const entry = JSON.parse(raw) as ClientWeatherCacheEntry;
      const exp = entry?.expiresAt ? new Date(entry.expiresAt).getTime() : NaN;
      if (!Number.isFinite(exp) || now >= exp) {
        localStorage.removeItem(k);
        continue;
      }
      remaining.set(k, exp);
    } catch {
      localStorage.removeItem(k);
    }
  }
  return remaining;
}

/** Drop oldest entries (by expiresAt) until at or under max. */
function enforceWeatherKeyLimit(maxKeys: number): void {
  const remaining = pruneExpiredWeatherKeys();
  if (remaining.size <= maxKeys) return;
  const sorted = [...remaining.entries()].sort((a, b) => a[1] - b[1]);
  const overflow = sorted.length - maxKeys;
  for (let i = 0; i < overflow; i++) {
    localStorage.removeItem(sorted[i][0]);
  }
}

export function readClientWeatherCache(id: string): DestinationWeatherDetail | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const entry = JSON.parse(raw) as ClientWeatherCacheEntry;
    if (!entry?.expiresAt || !entry?.data) return null;
    if (Date.now() >= new Date(entry.expiresAt).getTime()) {
      localStorage.removeItem(key(id));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function writeClientWeatherCache(detail: DestinationWeatherDetail): void {
  if (typeof window === 'undefined') return;
  try {
    pruneExpiredWeatherKeys();
    const entry: ClientWeatherCacheEntry = {
      fetchedAt: detail.fetchedAt,
      expiresAt: detail.expiresAt,
      data: detail,
    };
    localStorage.setItem(key(detail.id), JSON.stringify(entry));
    enforceWeatherKeyLimit(WEATHER_CLIENT_CACHE_MAX_KEYS);
  } catch {
    /* quota / private mode — try prune + one retry */
    try {
      pruneExpiredWeatherKeys();
      enforceWeatherKeyLimit(Math.max(2, WEATHER_CLIENT_CACHE_MAX_KEYS - 2));
      const entry: ClientWeatherCacheEntry = {
        fetchedAt: detail.fetchedAt,
        expiresAt: detail.expiresAt,
        data: detail,
      };
      localStorage.setItem(key(detail.id), JSON.stringify(entry));
    } catch {
      /* ignore */
    }
  }
}

export function clearClientWeatherCache(id?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.removeItem(key(id));
      return;
    }
    listWeatherKeys().forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** True when local cache is still within TTL. */
export function isClientWeatherCacheFresh(id: string): boolean {
  return readClientWeatherCache(id) != null;
}
