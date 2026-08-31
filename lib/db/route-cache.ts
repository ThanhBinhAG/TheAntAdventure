import type { BackupData, PageSlug } from '../types';
import { bootTablesForPage, TABLE_TO_STORE_KEY, type SyncArrayTable } from './sync-config';

const ROUTE_CACHE_KEY = 'ant-crm-route-v1';

/** Soft reload within the same tab reuses loaded tables without waiting on network. */
export const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Do not background-revalidate until cache is at least this old. */
export const ROUTE_REVALIDATE_MIN_AGE_MS = 60 * 1000;

/** Soft cap for sessionStorage JSON (~1.5 MB) to avoid QuotaExceeded. */
export const ROUTE_CACHE_MAX_BYTES = 1_500_000;

/**
 * Never persist these in sessionStorage — keep memory / network-only.
 * Photos and chat can blow past the browser quota after a few route visits.
 * Dev B BFF-managed CRM tables must not snapshot via route cache either.
 */
export const ROUTE_CACHE_DENYLIST: readonly SyncArrayTable[] = [
  'photos',
  'photo_folders',
  'customers',
  'agents',
  'leads',
  'comms',
  'bookings',
  'contracts',
  'hotels',
  'transport',
  'restaurants',
  'cruises',
  'suppliers',
  'feedback',
  'finance',
  'accounts_receivable',
  'accounts_payable',
  'tax_reports',
  'staff',
  'dev_notes',
  'cal_events',
] as const;

/** Drop order when payload exceeds ROUTE_CACHE_MAX_BYTES (heaviest first). */
const SIZE_TRIM_ORDER: readonly SyncArrayTable[] = [
  'tour_outline_days',
  'tour_drafts',
  'bookings',
  'comms',
  'product_pricing',
  'products',
  'leads',
  'customers',
  'hotels',
  'transport',
  'restaurants',
  'cruises',
  'suppliers',
  'contracts',
  'finance',
  'accounts_receivable',
  'accounts_payable',
  'attractions',
  'cal_events',
  'tasks',
  'feedback',
  'agents',
  'guides',
  'staff',
  'tax_reports',
  'dev_notes',
] as const;

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

const DENY_SET = new Set<string>(ROUTE_CACHE_DENYLIST);

/** Filter out denylisted tables (messages never persisted). */
export function tablesEligibleForRouteCache(
  tables: readonly SyncArrayTable[]
): SyncArrayTable[] {
  return [...new Set(tables)].filter((t) => !DENY_SET.has(t));
}

/**
 * Tables to persist for a route: PAGE_BOOT_TABLES[slug] ∩ hydrated, minus denylist.
 * Without a slug, returns empty — callers must pass lastSlug to avoid union-of-all growth.
 */
export function resolveRouteCacheTables(
  slug: PageSlug | undefined,
  hydrated: readonly SyncArrayTable[]
): SyncArrayTable[] {
  if (!slug) return [];
  const hydratedSet = new Set(hydrated);
  return tablesEligibleForRouteCache(
    bootTablesForPage(slug).filter((t) => hydratedSet.has(t))
  );
}

/**
 * Build a partial backup for requested tables.
 * `includeMessages` is ignored — chat is never written to sessionStorage.
 */
export function pickRouteSnapshot(
  backup: BackupData,
  tables: readonly SyncArrayTable[],
  includeMessages = false
): Partial<BackupData> {
  void includeMessages;
  const partial: Partial<BackupData> = {};
  const eligible = tablesEligibleForRouteCache(tables);
  for (const table of eligible) {
    const key = TABLE_TO_STORE_KEY[table];
    const value = backup[key];
    if (value !== undefined) {
      (partial as Record<string, unknown>)[key] = value;
    }
  }
  return partial;
}

function utf8ByteLength(s: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s).length;
  return s.length;
}

function trimTablesToFit(
  backup: BackupData,
  tables: SyncArrayTable[],
  maxBytes: number
): { tables: SyncArrayTable[]; data: Partial<BackupData>; raw: string } {
  let current = [...tables];
  for (;;) {
    const data = pickRouteSnapshot(backup, current, false);
    const payload: RouteCachePayload = {
      savedAt: Date.now(),
      tables: current,
      data,
      messagesHydrated: false,
    };
    const raw = JSON.stringify(payload);
    if (utf8ByteLength(raw) <= maxBytes || current.length === 0) {
      return { tables: current, data, raw };
    }
    let dropped = false;
    for (const heavy of SIZE_TRIM_ORDER) {
      const idx = current.indexOf(heavy);
      if (idx >= 0) {
        current = current.filter((_, i) => i !== idx);
        dropped = true;
        break;
      }
    }
    if (!dropped) {
      current = current.slice(0, -1);
    }
  }
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
    // Strip denylisted tables from older snapshots (messages never restored from cache).
    const tables = tablesEligibleForRouteCache(parsed.tables as SyncArrayTable[]);
    const data = { ...parsed.data };
    delete data.messages;
    for (const denied of ROUTE_CACHE_DENYLIST) {
      const key = TABLE_TO_STORE_KEY[denied];
      delete (data as Record<string, unknown>)[key];
    }
    return {
      ...parsed,
      tables,
      data,
      messagesHydrated: false,
    };
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

  const eligible = tablesEligibleForRouteCache(tables);
  // Rebuild from provided data as a pseudo-backup for trim helpers.
  const backup = data as BackupData;
  const trimmed = trimTablesToFit(backup, eligible, ROUTE_CACHE_MAX_BYTES);

  const payload: RouteCachePayload = {
    savedAt: Date.now(),
    tables: trimmed.tables,
    data: trimmed.data,
    // Never claim messages are cached in sessionStorage.
    messagesHydrated: false,
    lastSlug,
  };

  const raw = JSON.stringify(payload);

  try {
    sessionStorage.setItem(ROUTE_CACHE_KEY, raw);
  } catch {
    try {
      sessionStorage.removeItem(ROUTE_CACHE_KEY);
      // Retry a minimal boot-only snapshot (no heavy tables).
      const slimTables = trimmed.tables.slice(0, Math.min(3, trimmed.tables.length));
      const slimData = pickRouteSnapshot(backup, slimTables, false);
      const slimPayload: RouteCachePayload = {
        savedAt: Date.now(),
        tables: slimTables,
        data: slimData,
        messagesHydrated: false,
        lastSlug,
      };
      sessionStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(slimPayload));
    } catch {
      /* quota / private mode — leave cache empty */
    }
  }

  // Silence unused param while keeping API stable for callers.
  void messagesHydrated;
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
