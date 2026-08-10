import {
  clearRouteCache,
  pickRouteSnapshot,
  readRouteCache,
  resolveRouteCacheTables,
  shouldRevalidateCache,
  tablesEligibleForRouteCache,
  writeRouteCache,
} from './route-cache';
import { withoutAutoSyncAsync } from './auto-sync';
import { pushSnapshotToSupabase } from './sync-push';
import { appLog } from '../system/app-logger';
import { isRemoteDataEnabled, isRemoteDataEnabled as remoteEnabled } from '../env';
import { mergeAttractionSeeds } from '../attractions/ensure-attraction-seeds';
import { mergeRequiredProducts } from '../products/ensure-core-products';
import { mergeSupplierSeeds } from '../suppliers/ensure-supplier-seeds';
import { pruneProductPricingToProducts } from '../products/product-pricing-helpers';
import { useStore } from '../store';
import type {
  BackupData,
  ChatMessages,
  CruiseSupplier,
  ExtendedSupplier,
  Hotel,
  PageSlug,
  ProductPricing,
  RestaurantSupplier,
  TransportSupplier,
  Attraction,
} from '../types';
import {
  bootTablesForPage,
  countBackupRows,
  MESSAGES_TABLE,
  SIDEBAR_IDLE_TABLES,
  SYNC_ARRAY_TABLES,
  SYNC_HYDRATE_WAVES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import {
  getHydratedTables,
  getHydrationState,
  isMessagesHydrated,
  isTableHydrated,
  markHydrationFailed,
  markHydrationPending,
  markHydrationReady,
  markMessagesHydrated,
  markTablesHydrated,
  updateBaselineCounts,
} from './sync-lifecycle';
import { db as supabaseDb } from './supabase';
import { withTimeout } from './timeout';

export { isRemoteDataEnabled } from '../env';
export {
  getHydrationState,
  subscribeHydration,
  type HydrationState,
} from './sync-lifecycle';

const STORAGE_KEY = 'ant-crm-v43';
const BOOT_TIMEOUT_MS = 8_000;
const ENSURE_TIMEOUT_MS = 12_000;
const PING_TIMEOUT_MS = 8_000;

type StoreKey = keyof BackupData;

const bootPromises = new Map<string, Promise<boolean>>();
const ensureInFlight = new Map<string, Promise<void>>();

let sidebarIdleScheduled = false;
let visibilityListenerReady = false;
let pendingRevalidateTables: SyncArrayTable[] | null = null;

async function fetchTables(tables: readonly SyncArrayTable[]): Promise<Partial<BackupData>> {
  const results = await Promise.all(
    tables.map(async (table) => {
      const rows = await supabaseDb[table].getAll();
      return [TABLE_TO_STORE_KEY[table], rows] as const;
    })
  );

  const backup: Partial<BackupData> = {};
  for (const [key, value] of results) {
    if (Array.isArray(value)) {
      (backup as Record<string, unknown>)[key] = value;
    }
  }
  return backup;
}

async function fetchMessages(): Promise<Partial<BackupData>> {
  const messages = await supabaseDb.messages.get();
  if (messages && typeof messages === 'object' && Object.keys(messages).length > 0) {
    return { messages: messages as ChatMessages };
  }
  return { messages: {} };
}

function baselineForTables(
  tables: readonly SyncArrayTable[],
  backup: BackupData
): Partial<Record<SyncArrayTable, number>> {
  const counts = countBackupRows(backup);
  const baseline: Partial<Record<SyncArrayTable, number>> = {};
  for (const table of tables) {
    baseline[table] = counts[table] ?? 0;
  }
  return baseline;
}

function persistRouteCache(slug?: PageSlug): void {
  const existing = readRouteCache();
  const effectiveSlug = slug ?? existing?.lastSlug;
  // Without a route slug, do not expand cache to the union of all hydrated tables.
  if (!effectiveSlug) return;

  const hydrated = getHydratedTables();
  const tables = resolveRouteCacheTables(effectiveSlug, hydrated);
  const backup = useStore.getState().exportBackup();
  writeRouteCache(
    pickRouteSnapshot(backup, tables, false),
    tables,
    false,
    effectiveSlug
  );
}

/** After local mutations, refresh session route cache so F5 does not restore stale empty slices. */
export function persistRouteCacheFromStore(slug?: PageSlug): void {
  persistRouteCache(slug);
}

function markReadyFromStore(): void {
  const backup = useStore.getState().exportBackup();
  const tables = getHydratedTables();
  markHydrationReady(baselineForTables(tables, backup));
}

async function applyWaveToStore(remote: Partial<BackupData>): Promise<void> {
  await withoutAutoSyncAsync(async () => {
    const state = useStore.getState();
    const hasProducts = Object.prototype.hasOwnProperty.call(remote, 'products');
    const hasPricing = Object.prototype.hasOwnProperty.call(remote, 'productPricing');
    const hasAttractions = Object.prototype.hasOwnProperty.call(remote, 'attractions');
    const hasSupplierSlice =
      Object.prototype.hasOwnProperty.call(remote, 'hotels') ||
      Object.prototype.hasOwnProperty.call(remote, 'transport') ||
      Object.prototype.hasOwnProperty.call(remote, 'restaurants') ||
      Object.prototype.hasOwnProperty.call(remote, 'cruises') ||
      Object.prototype.hasOwnProperty.call(remote, 'specialSuppliers');

    const mergedProducts = hasProducts
      ? mergeRequiredProducts(remote.products as never[])
      : state.products;
    const rawPricing: ProductPricing[] = hasPricing
      ? (remote.productPricing as ProductPricing[])
      : state.productPricing;
    const mergedPricing =
      hasProducts || hasPricing
        ? pruneProductPricingToProducts(rawPricing, mergedProducts)
        : state.productPricing;
    const mergedAttractions = hasAttractions
      ? mergeAttractionSeeds((remote.attractions as Attraction[]) ?? state.attractions)
      : state.attractions;
    const mergedSuppliers = hasSupplierSlice
      ? mergeSupplierSeeds({
          hotels: (remote.hotels as Hotel[] | undefined) ?? state.hotels,
          transport: (remote.transport as TransportSupplier[] | undefined) ?? state.transport,
          restaurants: (remote.restaurants as RestaurantSupplier[] | undefined) ?? state.restaurants,
          cruises: (remote.cruises as CruiseSupplier[] | undefined) ?? state.cruises,
          specialSuppliers:
            (remote.specialSuppliers as ExtendedSupplier[] | undefined) ?? state.specialSuppliers,
        })
      : null;

    const patch: Partial<BackupData> = { ...remote };
    if (hasProducts) patch.products = mergedProducts;
    if (hasProducts || hasPricing) patch.productPricing = mergedPricing;
    if (hasAttractions) patch.attractions = mergedAttractions;
    if (mergedSuppliers) {
      patch.hotels = mergedSuppliers.hotels;
      patch.transport = mergedSuppliers.transport;
      patch.restaurants = mergedSuppliers.restaurants;
      patch.cruises = mergedSuppliers.cruises;
      patch.specialSuppliers = mergedSuppliers.specialSuppliers;
    }

    const next: BackupData = {
      ...state.exportBackup(),
      ...Object.fromEntries((Object.keys(patch) as StoreKey[]).map((key) => [key, patch[key]])),
      exportedAt: new Date().toISOString(),
      version: '5.0',
    } as BackupData;

    state.importBackup(next);
  });
}

async function raceTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const result = await Promise.race([
    promise.then((data) => ({ timedOut: false as const, data })),
    new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    }),
  ]);
  if (result.timedOut) {
    throw new Error(`${label} timeout after ${timeoutMs}ms`);
  }
  return result.data;
}

async function fetchAndApplyTables(
  tables: readonly SyncArrayTable[],
  label: string
): Promise<void> {
  const missing = tables.filter((t) => !isTableHydrated(t));
  if (!missing.length) return;

  const remote = await raceTimeout(fetchTables(missing), BOOT_TIMEOUT_MS, label);
  await applyWaveToStore(remote);
  markTablesHydrated(missing);
  const backup = useStore.getState().exportBackup();
  updateBaselineCounts(baselineForTables(missing, backup));
}

async function revalidateTablesInBackground(tables: readonly SyncArrayTable[]): Promise<void> {
  const toFetch = [...new Set(tables)];
  try {
    await fetchAndApplyTables(toFetch, 'Route revalidate');
    persistRouteCache();
    appLog('hydrate', 'Route background revalidate done', { meta: { tables: toFetch } });
  } catch (e) {
    appLog('hydrate', 'Route background revalidate failed — keeping cache', {
      level: 'warn',
      error: e,
    });
  }
}

function ensureVisibilityRevalidateListener(): void {
  if (visibilityListenerReady || typeof document === 'undefined') return;
  visibilityListenerReady = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !pendingRevalidateTables?.length) return;
    const tables = pendingRevalidateTables;
    pendingRevalidateTables = null;
    void revalidateTablesInBackground(tables);
  });
}

function scheduleDelayedRevalidate(tables: readonly SyncArrayTable[], cacheSavedAt: number): void {
  if (!shouldRevalidateCache(cacheSavedAt)) return;
  pendingRevalidateTables = [...new Set(tables)];
  ensureVisibilityRevalidateListener();
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        if (!pendingRevalidateTables) return;
        const t = pendingRevalidateTables;
        pendingRevalidateTables = null;
        void revalidateTablesInBackground(t);
      },
      { timeout: 5000 }
    );
  } else {
    setTimeout(() => {
      if (!pendingRevalidateTables) return;
      const t = pendingRevalidateTables;
      pendingRevalidateTables = null;
      void revalidateTablesInBackground(t);
    }, 3000);
  }
}

export async function checkSupabaseConnection(): Promise<ConnectionStatus> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase not enabled in .env.local' };
  }
  return withTimeout(
    supabaseDb.healthCheck(),
    PING_TIMEOUT_MS,
    { ok: false, latencyMs: PING_TIMEOUT_MS, tables: {}, error: 'Connection timeout — kiểm tra URL Supabase' }
  );
}

export async function quickSupabasePing(): Promise<ConnectionStatus> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase not enabled in .env.local' };
  }
  return withTimeout(
    supabaseDb.quickPing(),
    PING_TIMEOUT_MS,
    { ok: false, latencyMs: PING_TIMEOUT_MS, tables: {}, error: 'Connection timeout — kiểm tra URL Supabase' }
  );
}

export type ConnectionStatus = {
  ok: boolean;
  latencyMs: number;
  tables: Record<string, number>;
  error?: string;
};

export type VerifyResult = {
  ok: boolean;
  local: Record<string, number>;
  remote: Record<string, number>;
  mismatches: string[];
};

export function resetShellHydrateGuard() {
  bootPromises.clear();
  sidebarIdleScheduled = false;
  pendingRevalidateTables = null;
}

async function runPageBoot(slug: PageSlug): Promise<boolean> {
  if (!remoteEnabled()) return false;

  const bootTables = bootTablesForPage(slug);
  const phase = getHydrationState().phase;
  if (phase !== 'ready') markHydrationPending();

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
      scheduleDelayedRevalidate(bootTables, cached.savedAt);
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

/**
 * Fetch PAGE_BOOT_TABLES for the current route. Deduped per slug.
 */
export function ensurePageBootLoaded(slug: PageSlug): Promise<boolean> {
  if (!remoteEnabled()) return Promise.resolve(false);
  const existing = bootPromises.get(slug);
  if (existing) return existing;

  const promise = runPageBoot(slug).finally(() => {
    bootPromises.delete(slug);
  });
  bootPromises.set(slug, promise);
  return promise;
}

/** Sidebar badges — idle after page paint. */
export function scheduleSidebarIdleLoad(): void {
  if (sidebarIdleScheduled) return;
  sidebarIdleScheduled = true;

  const run = () => {
    void ensureTablesLoaded(SIDEBAR_IDLE_TABLES).then(() => persistRouteCache());
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    setTimeout(run, 2500);
  }
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

/** Route-first boot + sidebar idle. */
export async function ensurePageDataLoaded(slug: PageSlug): Promise<boolean> {
  const ok = await ensurePageBootLoaded(slug);
  if (!ok) return false;
  scheduleSidebarIdleLoad();
  return true;
}

/** @deprecated Use ensurePageBootLoaded — kept for callers during migration. */
export function hydrateShellFromSupabase(): Promise<boolean> {
  return ensurePageBootLoaded('dashboard');
}

export async function ensureAllTablesLoaded(): Promise<boolean> {
  const ok = await ensurePageBootLoaded('dashboard');
  if (!ok) markHydrationPending();

  for (const wave of SYNC_HYDRATE_WAVES) {
    const need = wave.filter((t) => !isTableHydrated(t));
    if (need.length) await ensureTablesLoaded(need);
  }
  const stillMissing = SYNC_ARRAY_TABLES.filter((t) => !isTableHydrated(t));
  if (stillMissing.length) await ensureTablesLoaded(stillMissing);

  await ensureMessagesLoaded();
  markReadyFromStore();
  persistRouteCache();
  return true;
}

export async function hydrateFromSupabase(): Promise<boolean> {
  resetShellHydrateGuard();
  clearRouteCache();
  markHydrationPending();

  if (!remoteEnabled()) return false;

  try {
    for (const wave of SYNC_HYDRATE_WAVES) {
      const need = wave.filter((t) => !isTableHydrated(t));
      if (need.length) await ensureTablesLoaded(need);
    }
    await ensureMessagesLoaded();
    markReadyFromStore();
    persistRouteCache();
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Hydrate failed';
    appLog('hydrate', 'Full hydrate failed', { level: 'warn', error: e });
    markHydrationFailed(message);
    return false;
  }
}

export { pushSnapshotToSupabase, pushTablesToSupabase } from './sync-push';

export async function verifyLocalMatchesRemote(): Promise<VerifyResult> {
  const local = countBackupRows(useStore.getState().exportBackup());
  const health = await checkSupabaseConnection();
  const remote = health.tables;
  const mismatches: string[] = [];

  const tables = getHydratedTables();
  for (const table of tables) {
    const l = local[table] ?? 0;
    const r = remote[table] ?? 0;
    if (l !== r) mismatches.push(`${table}: local=${l}, remote=${r}`);
  }
  if (isMessagesHydrated()) {
    const l = local[MESSAGES_TABLE] ?? 0;
    const r = remote[MESSAGES_TABLE] ?? 0;
    if (l !== r) mismatches.push(`${MESSAGES_TABLE}: local=${l}, remote=${r}`);
  }

  return { ok: mismatches.length === 0 && health.ok, local, remote, mismatches };
}

export function clearLocalPersistedData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export async function completeMigrationToSupabase(): Promise<{
  ok: boolean;
  error?: string;
  verify?: VerifyResult;
  needsReload?: boolean;
}> {
  await ensureAllTablesLoaded();
  const push = await pushSnapshotToSupabase({ force: true });
  if (!push.ok) return { ok: false, error: push.error };

  const verify = await verifyLocalMatchesRemote();
  if (!verify.ok) {
    return {
      ok: false,
      error: verify.mismatches.length
        ? `Count mismatch:\n${verify.mismatches.join('\n')}`
        : 'Verification failed',
      verify,
    };
  }

  updateBaselineCounts(countBackupRows(useStore.getState().exportBackup()));
  clearLocalPersistedData();
  clearRouteCache();
  resetShellHydrateGuard();
  await hydrateFromSupabase();
  return { ok: true, verify, needsReload: true };
}
