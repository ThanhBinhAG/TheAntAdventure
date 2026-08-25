import { isRemoteDataEnabled as remoteEnabled } from '../../env';
import { clientLog } from '../../system/client-logger';
import { useStore } from '../../store';
import type { PageSlug } from '../../types';
import {
  bootTablesForPage,
  type SyncArrayTable,
} from '../sync-config';
import {
  getHydrationState,
  isMessagesHydrated,
  isTableHydrated,
  markHydrationFailed,
  markHydrationSoftPending,
  markMessagesHydrated,
  markTablesHydrated,
  updateBaselineCounts,
} from '../sync-lifecycle';
import {
  readRouteCache,
  tablesEligibleForRouteCache,
} from '../route-cache';
import { persistRouteCache } from './route-persist';
import {
  applyWaveToStore,
  baselineForTables,
  bootPromises,
  bootSettled,
  cancelDelayedRevalidate,
  ENSURE_TIMEOUT_MS,
  ensureInFlight,
  fetchAndApplyTables,
  fetchMessages,
  fetchTables,
  markReadyFromStore,
  raceTimeout,
  scheduleDelayedRevalidate,
  tablesForDelayedRevalidate,
} from './shared';

let activeBootSlug: PageSlug | null = null;
let bootGeneration = 0;

function isBootStillActive(slug: PageSlug): boolean {
  return activeBootSlug === slug;
}

/** Mark the route PageDataGate is booting; returns generation token for stale guards. */
export function setActivePageBoot(slug: PageSlug): number {
  activeBootSlug = slug;
  bootGeneration += 1;
  return bootGeneration;
}

/** Invalidate in-flight boot when navigating away (PageDataGate cleanup). */
export function cancelPageBoot(slug?: PageSlug): void {
  if (slug == null || activeBootSlug === slug) {
    activeBootSlug = null;
    bootGeneration += 1;
  }
  // Do not delete in-flight promise: React Strict Mode can unmount/remount quickly
  // and strict cleanup must not force an identical route boot (and duplicate GETs).
}

/** True if this route's boot tables are already hydrated (or route boots nothing). */
export function routeBootSatisfied(slug: PageSlug): boolean {
  const tables = bootTablesForPage(slug);
  if (!tables.length) return true;
  return tables.every((t) => isTableHydrated(t));
}

async function runPageBoot(slug: PageSlug): Promise<boolean> {
  if (!remoteEnabled()) return false;

  const bootTables = bootTablesForPage(slug);
  const phase = getHydrationState().phase;
  // Soft pending keeps already-hydrated tables across nav (avoids wipe/race on mid-boot switch).
  if (phase !== 'ready') markHydrationSoftPending();
  cancelDelayedRevalidate();

  try {
    if (!bootTables.length) {
      markReadyFromStore();
      if (isBootStillActive(slug)) {
        clientLog('hydrate', 'Route boot skipped (no tables)', { meta: { slug } });
      }
      if (slug === 'teamchat' && isBootStillActive(slug)) {
        await ensureMessagesLoaded();
      }
      return true;
    }

    const cached = readRouteCache();
    const cacheableBoot = tablesEligibleForRouteCache(bootTables);
    const cacheCoversBoot =
      cached != null &&
      cacheableBoot.length > 0 &&
      cacheableBoot.every((t) => cached.tables.includes(t));

    if (cacheCoversBoot && cached) {
      await applyWaveToStore(cached.data);
      markTablesHydrated(cached.tables);
      if (cached.messagesHydrated) markMessagesHydrated();
      // Denylisted boot tables (e.g. photos) are never in sessionStorage — fetch them.
      const missingBoot = bootTables.filter((t) => !isTableHydrated(t));
      if (missingBoot.length) {
        await fetchAndApplyTables(missingBoot, `Route boot missing (${slug})`);
      }
      if (!isBootStillActive(slug)) return routeBootSatisfied(slug);

      markReadyFromStore();
      persistRouteCache(slug);
      clientLog('hydrate', 'Route boot from cache', {
        meta: {
          slug,
          tables: bootTables.length,
          source: 'sessionCache',
          networkExtra: missingBoot.length,
        },
      });
      const toRevalidate = tablesForDelayedRevalidate(bootTables, missingBoot);
      if (toRevalidate.length) {
        scheduleDelayedRevalidate(toRevalidate, cached.savedAt);
      }
    } else {
      await fetchAndApplyTables(bootTables, `Route boot (${slug})`);
      if (!isBootStillActive(slug)) return routeBootSatisfied(slug);

      markReadyFromStore();
      persistRouteCache(slug);
      clientLog('hydrate', 'Route boot from network', {
        meta: { slug, tables: bootTables.length, source: 'network' },
      });
    }

    if (slug === 'teamchat' && isBootStillActive(slug)) {
      await ensureMessagesLoaded();
    }
    return true;
  } catch (e) {
    if (!isBootStillActive(slug)) return routeBootSatisfied(slug);
    const message = e instanceof Error ? e.message : 'Hydrate failed';
    clientLog('hydrate', 'Route boot failed', { level: 'warn', error: e, meta: { slug } });
    markHydrationFailed(message);
    return false;
  }
}

/** True when this slug already booted successfully and its boot tables are still hydrated. */
export function shouldSkipSettledBoot(slug: PageSlug): boolean {
  if (!bootSettled.has(slug)) return false;
  const tables = bootTablesForPage(slug);
  if (!tables.length) return true;
  return tables.every((t) => isTableHydrated(t));
}

/**
 * Fetch PAGE_BOOT_TABLES for the current route. Deduped per slug for the session
 * after a successful boot (Strict Mode remount / revisit will not refetch).
 */
export function ensurePageBootLoaded(slug: PageSlug, generation?: number): Promise<boolean> {
  if (!remoteEnabled()) return Promise.resolve(false);
  if (shouldSkipSettledBoot(slug)) return Promise.resolve(true);

  const existing = bootPromises.get(slug);
  if (existing) {
    return existing.promise;
  }

  const gen = generation ?? bootGeneration;
  const promise = runPageBoot(slug)
    .then((ok) => {
      if (ok && isBootStillActive(slug)) bootSettled.add(slug);
      return ok;
    })
    .finally(() => {
      // Only clear when this is the active generation promise.
      const current = bootPromises.get(slug);
      if (current?.promise === promise) bootPromises.delete(slug);
    });

  bootPromises.set(slug, { gen, promise });
  return promise;
}

export async function ensureTablesLoaded(tables: readonly SyncArrayTable[]): Promise<void> {
  if (!remoteEnabled()) return;

  const missing = tables.filter((t) => !isTableHydrated(t));
  if (!missing.length) return;

  const key = missing.slice().sort().join(',');
  const existing = ensureInFlight.get(key);
  if (existing) {
    await existing;
    return;
  }

  const work = (async () => {
    try {
      const remote = await raceTimeout(
        fetchTables(missing),
        ENSURE_TIMEOUT_MS,
        `ensureTablesLoaded(${missing.length})`
      );
      await applyWaveToStore(remote);
      markTablesHydrated(missing);
      const backup = useStore.getState().exportBackup();
      updateBaselineCounts(baselineForTables(missing, backup));
      clientLog('hydrate', 'ensureTablesLoaded applied', { meta: { tables: missing } });
    } finally {
      ensureInFlight.delete(key);
    }
  })();

  ensureInFlight.set(key, work);
  await work;
}

export async function ensureMessagesLoaded(): Promise<void> {
  if (!remoteEnabled() || isMessagesHydrated()) return;

  const key = '__messages__';
  const existing = ensureInFlight.get(key);
  if (existing) {
    await existing;
    return;
  }

  const work = (async () => {
    try {
      const messagesPatch = await raceTimeout(
        fetchMessages(),
        ENSURE_TIMEOUT_MS,
        'ensureMessagesLoaded'
      );
      await applyWaveToStore(messagesPatch);
      markMessagesHydrated();
      persistRouteCache();
    } finally {
      ensureInFlight.delete(key);
    }
  })();

  ensureInFlight.set(key, work);
  await work;
}

/** Route-first boot — sidebar badges use count API or store after route hydrate. */
export async function ensurePageDataLoaded(slug: PageSlug, generation?: number): Promise<boolean> {
  return ensurePageBootLoaded(slug, generation);
}
