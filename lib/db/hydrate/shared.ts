import { withoutAutoSyncAsync } from '../auto-sync';
import { appLog } from '../../system/app-logger';
import { mergeAttractionSeeds } from '../../attractions/ensure-attraction-seeds';
import { mergeRequiredProducts } from '../../products/ensure-core-products';
import { mergeSupplierSeeds } from '../../suppliers/ensure-supplier-seeds';
import { pruneProductPricingToProducts } from '../../products/product-pricing-helpers';
import { useStore } from '../../store';
import type {
  BackupData,
  ChatMessages,
  CruiseSupplier,
  ExtendedSupplier,
  Hotel,
  ProductPricing,
  RestaurantSupplier,
  TransportSupplier,
  Attraction,
} from '../../types';
import {
  countBackupRows,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from '../sync-config';
import {
  getHydratedTables,
  isTableHydrated,
  markHydrationReady,
  markTablesHydrated,
  updateBaselineCounts,
} from '../sync-lifecycle';
import { db as supabaseDb } from '../supabase';
import {
  shouldRevalidateCache,
  tablesEligibleForRouteCache,
} from '../route-cache';
import { persistRouteCache } from './route-persist';

export const BOOT_TIMEOUT_MS = 8_000;
export const ENSURE_TIMEOUT_MS = 12_000;

type StoreKey = keyof BackupData;

/** Single-instance guards — must live in one module so dedupe maps stay consistent. */
export const bootPromises = new Map<string, Promise<boolean>>();
/** Slugs whose boot already succeeded this session. Cleared by resetShellHydrateGuard. */
export const bootSettled = new Set<string>();
export const ensureInFlight = new Map<string, Promise<void>>();
/** Per-table GET dedupe — concurrent boot/ensure/revalidate share one network call. */
const tableFetchInFlight = new Map<SyncArrayTable, Promise<unknown>>();

export let visibilityListenerReady = false;
export let pendingRevalidateTables: SyncArrayTable[] | null = null;
/** Bumped by cancel/schedule so stale idle/timeout callbacks no-op. */
let revalidateGeneration = 0;

export function setVisibilityListenerReady(value: boolean): void {
  visibilityListenerReady = value;
}

export function setPendingRevalidateTables(value: SyncArrayTable[] | null): void {
  pendingRevalidateTables = value;
}

/** Drop pending idle revalidate (route change / gate unmount). */
export function cancelDelayedRevalidate(): void {
  revalidateGeneration += 1;
  setPendingRevalidateTables(null);
}

export async function fetchTables(tables: readonly SyncArrayTable[]): Promise<Partial<BackupData>> {
  const results = await Promise.all(
    tables.map(async (table) => {
      let pending = tableFetchInFlight.get(table);
      if (!pending) {
        pending = Promise.resolve(supabaseDb[table].getAll()).finally(() => {
          tableFetchInFlight.delete(table);
        });
        tableFetchInFlight.set(table, pending);
      }
      const rows = await pending;
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

export async function fetchMessages(): Promise<Partial<BackupData>> {
  const messages = await supabaseDb.messages.get();
  if (messages && typeof messages === 'object' && Object.keys(messages).length > 0) {
    return { messages: messages as ChatMessages };
  }
  return { messages: {} };
}

export function baselineForTables(
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

export function markReadyFromStore(): void {
  const backup = useStore.getState().exportBackup();
  const tables = getHydratedTables();
  markHydrationReady(baselineForTables(tables, backup));
}

export async function applyWaveToStore(remote: Partial<BackupData>): Promise<void> {
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

export async function raceTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
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

/**
 * Which tables to network-fetch before apply.
 * Default skips already-hydrated tables; `force` refetches (route revalidate after cache boot).
 */
export function resolveFetchTables(
  tables: readonly SyncArrayTable[],
  force = false,
  hydrated: (t: SyncArrayTable) => boolean = isTableHydrated
): SyncArrayTable[] {
  const unique = [...new Set(tables)];
  return force ? unique : unique.filter((t) => !hydrated(t));
}

export async function fetchAndApplyTables(
  tables: readonly SyncArrayTable[],
  label: string,
  options?: { force?: boolean }
): Promise<void> {
  const toFetch = resolveFetchTables(tables, options?.force === true);
  if (!toFetch.length) return;

  const remote = await raceTimeout(fetchTables(toFetch), BOOT_TIMEOUT_MS, label);
  await applyWaveToStore(remote);
  markTablesHydrated(toFetch);
  const backup = useStore.getState().exportBackup();
  updateBaselineCounts(baselineForTables(toFetch, backup));
}

async function revalidateTablesInBackground(tables: readonly SyncArrayTable[]): Promise<void> {
  const toFetch = [...new Set(tables)];
  try {
    // Force refetch even when tables are already marked hydrated (boot-from-cache path).
    await fetchAndApplyTables(toFetch, 'Route revalidate', { force: true });
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
  setVisibilityListenerReady(true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !pendingRevalidateTables?.length) return;
    const tables = pendingRevalidateTables;
    setPendingRevalidateTables(null);
    void revalidateTablesInBackground(tables);
  });
}

/**
 * Cache-boot idle revalidate: session-eligible tables only, minus any just fetched
 * (denylisted photos never go through this path).
 */
export function tablesForDelayedRevalidate(
  tables: readonly SyncArrayTable[],
  alreadyNetworkFetched: readonly SyncArrayTable[] = []
): SyncArrayTable[] {
  const skip = new Set(alreadyNetworkFetched);
  return tablesEligibleForRouteCache(tables).filter((t) => !skip.has(t));
}

export function scheduleDelayedRevalidate(tables: readonly SyncArrayTable[], cacheSavedAt: number): void {
  if (!shouldRevalidateCache(cacheSavedAt)) return;
  const eligible = tablesForDelayedRevalidate(tables);
  if (!eligible.length) return;
  const gen = ++revalidateGeneration;
  setPendingRevalidateTables(eligible);
  ensureVisibilityRevalidateListener();
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        if (gen !== revalidateGeneration || !pendingRevalidateTables) return;
        const t = pendingRevalidateTables;
        setPendingRevalidateTables(null);
        void revalidateTablesInBackground(t);
      },
      { timeout: 5000 }
    );
  } else {
    setTimeout(() => {
      if (gen !== revalidateGeneration || !pendingRevalidateTables) return;
      const t = pendingRevalidateTables;
      setPendingRevalidateTables(null);
      void revalidateTablesInBackground(t);
    }, 3000);
  }
}

export function resetShellHydrateGuard() {
  bootPromises.clear();
  bootSettled.clear();
  tableFetchInFlight.clear();
  cancelDelayedRevalidate();
}
