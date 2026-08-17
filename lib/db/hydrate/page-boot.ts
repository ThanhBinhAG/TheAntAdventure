import { isRemoteDataEnabled as remoteEnabled } from '../../env';
import { appLog } from '../../system/app-logger';
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

async function runPageBoot(slug: PageSlug): Promise<boolean> {
  if (!remoteEnabled()) return false;

  const bootTables = bootTablesForPage(slug);
  const phase = getHydrationState().phase;
  // Soft pending keeps already-hydrated tables across nav (avoids wipe/race on mid-boot switch).
  if (phase !== 'ready') markHydrationSoftPending();
  cancelDelayedRevalidate();

  try {
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
      markReadyFromStore();
      persistRouteCache(slug);
      appLog('hydrate', 'Route boot from cache', {
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
      markReadyFromStore();
      persistRouteCache(slug);
      appLog('hydrate', 'Route boot from network', {
        meta: { slug, tables: bootTables.length, source: 'network' },
      });
    }

    if (slug === 'teamchat') await ensureMessagesLoaded();
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Hydrate failed';
    appLog('hydrate', 'Route boot failed', { level: 'warn', error: e, meta: { slug } });
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
export function ensurePageBootLoaded(slug: PageSlug): Promise<boolean> {
  if (!remoteEnabled()) return Promise.resolve(false);
  if (shouldSkipSettledBoot(slug)) return Promise.resolve(true);
  const existing = bootPromises.get(slug);
  if (existing) return existing;

  const promise = runPageBoot(slug)
    .then((ok) => {
      if (ok) bootSettled.add(slug);
      return ok;
    })
    .finally(() => {
      bootPromises.delete(slug);
    });
  bootPromises.set(slug, promise);
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
      appLog('hydrate', 'ensureTablesLoaded applied', { meta: { tables: missing } });
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

/**
 * Route-first boot only — no global sidebar prefetch.
 * Planner / Tour Design badges use store data after those routes (or sales) hydrate.
 */
export async function ensurePageDataLoaded(slug: PageSlug): Promise<boolean> {
  return ensurePageBootLoaded(slug);
}
