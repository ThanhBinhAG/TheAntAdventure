import type { BackupData, ChatMessages, PageSlug } from '../types';
import { TABLE_TO_STORE_KEY, type SyncArrayTable } from './sync-config';

const ROUTE_CACHE_KEY = 'ant-crm-route-v1';

/** Soft reload within the same tab reuses loaded tables without waiting on network. */
export const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Do not background-revalidate until cache is at least this old. */
export const ROUTE_REVALIDATE_MIN_AGE_MS = 60 * 1000;

export type RouteCachePayload = {
  savedAt: number;
  tables: SyncArrayTable[];
  data: Partial<BackupData>;
  messagesHydrated: boolean;
  lastSlug?: PageSlug;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

/** Build a partial backup for all hydrated tables (+ messages if flagged). */
export function pickRouteSnapshot(
  backup: BackupData,
  tables: readonly SyncArrayTable[],
  includeMessages: boolean
): Partial<BackupData> {
  const partial: Partial<BackupData> = {};
  for (const table of tables) {
    const key = TABLE_TO_STORE_KEY[table];
    const value = backup[key];
    if (value !== undefined) {
      (partial as Record<string, unknown>)[key] = value;
    }
  }
  if (includeMessages && backup.messages) {
    partial.messages = backup.messages as ChatMessages;
  }
  return partial;
}

export function readRouteCache(): RouteCachePayload | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(ROUTE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RouteCachePayload;
    if (
      !parsed ||
      typeof parsed.savedAt !== 'number' ||
      !parsed.data ||
      !Array.isArray(parsed.tables)
    ) {
      return null;
    }
    if (Date.now() - parsed.savedAt > ROUTE_CACHE_TTL_MS) {
      sessionStorage.removeItem(ROUTE_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeRouteCache(
  data: Partial<BackupData>,
  tables: readonly SyncArrayTable[],
  messagesHydrated: boolean,
  lastSlug?: PageSlug
): void {
  if (!isBrowser()) return;
  try {
    const payload: RouteCachePayload = {
      savedAt: Date.now(),
      tables: [...new Set(tables)],
      data,
      messagesHydrated,
      lastSlug,
    };
    sessionStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearRouteCache(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(ROUTE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function shouldRevalidateCache(savedAt: number): boolean {
  return Date.now() - savedAt >= ROUTE_REVALIDATE_MIN_AGE_MS;
}

/** Legacy alias — same storage key as route cache. */
export const clearShellCache = clearRouteCache;
