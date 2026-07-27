import { withoutAutoSyncAsync } from './auto-sync';
import { pushSnapshotToSupabase } from './sync-push';
import { appLog } from '../system/app-logger';
import { isRemoteDataEnabled, isRemoteDataEnabled as remoteEnabled } from '../env';
import { mergeAttractionSeeds } from '../ensure-attraction-seeds';
import { mergeRequiredProducts } from '../ensure-core-products';
import { mergeSupplierSeeds } from '../ensure-supplier-seeds';
import { pruneProductPricingToProducts } from '../product-pricing-helpers';
import { useStore } from '../store';
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
} from '../types';
import {
  countBackupRows,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import {
  markHydrationFailed,
  markHydrationPending,
  markHydrationReady,
  subscribeHydration,
  updateBaselineCounts,
} from './sync-lifecycle';
import { db as supabaseDb } from './supabase';
import { withTimeout } from './timeout';

export { isRemoteDataEnabled } from '../env';
export {
  getHydrationState,
  subscribeHydration,
  type HydrationPhase,
  type HydrationState,
} from './sync-lifecycle';

const STORAGE_KEY = 'ant-crm-v43';
const HYDRATE_TIMEOUT_MS = 12_000;
const PING_TIMEOUT_MS = 8_000;

async function fetchRemoteBackup(): Promise<Partial<BackupData> | null> {
  const results = await Promise.all([
    ...SYNC_ARRAY_TABLES.map(async (table) => {
      const rows = await supabaseDb[table].getAll();
      return [TABLE_TO_STORE_KEY[table], rows] as const;
    }),
    supabaseDb.messages.get().then((m) => ['messages', m] as const),
  ]);

  const backup: Partial<BackupData> = {};
  let totalRows = 0;
  let fetchedAnyTable = false;

  for (const [key, value] of results) {
    if (key === 'messages') {
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        backup.messages = value as ChatMessages;
        totalRows += Object.keys(value).length;
      }
      fetchedAnyTable = true;
    } else if (Array.isArray(value)) {
      // Always attach arrays (including empty) so a wiped product_pricing is not treated as "missing".
      (backup as Record<string, unknown>)[key] = value;
      totalRows += value.length;
      fetchedAnyTable = true;
    }
  }

  return fetchedAnyTable || totalRows > 0 ? backup : null;
}

function baselineFromBackup(backup: BackupData): Partial<Record<SyncArrayTable, number>> {
  const counts = countBackupRows(backup);
  const baseline: Partial<Record<SyncArrayTable, number>> = {};
  for (const table of SYNC_ARRAY_TABLES) {
    baseline[table] = counts[table] ?? 0;
  }
  return baseline;
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

export async function hydrateFromSupabase(): Promise<boolean> {
  if (!remoteEnabled()) return false;

  markHydrationPending();

  try {
    const fetchResult = await Promise.race([
      fetchRemoteBackup().then((data) => ({ timedOut: false as const, data })),
      new Promise<{ timedOut: true }>((resolve) => {
        setTimeout(() => resolve({ timedOut: true }), HYDRATE_TIMEOUT_MS);
      }),
    ]);

    if (fetchResult.timedOut) {
      markHydrationFailed('Hydrate timeout — kiểm tra kết nối Supabase');
      return false;
    }

    const remote = fetchResult.data;

    await withoutAutoSyncAsync(async () => {
      const state = useStore.getState();
      const mergedProducts = remote?.products
        ? mergeRequiredProducts(remote.products as never[])
        : mergeRequiredProducts(state.products);
      // Supabase is source of truth — do not re-seed legacy TAA pricing on hydrate.
      const rawPricing: ProductPricing[] = Array.isArray(remote?.productPricing)
        ? (remote.productPricing as ProductPricing[])
        : state.productPricing;
      const mergedPricing = pruneProductPricingToProducts(rawPricing, mergedProducts);
      const mergedAttractions = mergeAttractionSeeds(
        (remote?.attractions as Attraction[] | undefined) ?? state.attractions
      );
      const mergedSuppliers = mergeSupplierSeeds({
        hotels: (remote?.hotels as Hotel[] | undefined) ?? state.hotels,
        transport: (remote?.transport as TransportSupplier[] | undefined) ?? state.transport,
        restaurants: (remote?.restaurants as RestaurantSupplier[] | undefined) ?? state.restaurants,
        cruises: (remote?.cruises as CruiseSupplier[] | undefined) ?? state.cruises,
        specialSuppliers: (remote?.specialSuppliers as ExtendedSupplier[] | undefined) ?? state.specialSuppliers,
      });

      if (remote) {
        state.importBackup({
          ...state.exportBackup(),
          ...remote,
          products: mergedProducts,
          productPricing: mergedPricing,
          attractions: mergedAttractions,
          hotels: mergedSuppliers.hotels,
          transport: mergedSuppliers.transport,
          restaurants: mergedSuppliers.restaurants,
          cruises: mergedSuppliers.cruises,
          specialSuppliers: mergedSuppliers.specialSuppliers,
          exportedAt: new Date().toISOString(),
          version: '5.0',
        });
      } else {
        useStore.setState({
          products: mergedProducts,
          productPricing: mergedPricing,
          attractions: mergedAttractions,
          hotels: mergedSuppliers.hotels,
          transport: mergedSuppliers.transport,
          restaurants: mergedSuppliers.restaurants,
          cruises: mergedSuppliers.cruises,
          specialSuppliers: mergedSuppliers.specialSuppliers,
        });
      }
    });

    const backup = useStore.getState().exportBackup();
    markHydrationReady(baselineFromBackup(backup));
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Hydrate failed';
    appLog('hydrate', 'Supabase hydrate failed', { level: 'warn', error: e });
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

  for (const table of [...SYNC_ARRAY_TABLES, MESSAGES_TABLE]) {
    const l = local[table] ?? 0;
    const r = remote[table] ?? 0;
    if (l !== r) mismatches.push(`${table}: local=${l}, remote=${r}`);
  }

  return { ok: mismatches.length === 0 && health.ok, local, remote, mismatches };
}

/** Remove persisted browser cache so next load comes from Supabase */
export function clearLocalPersistedData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Full migration: push → verify → clear localStorage → hydrate from remote.
 * Returns reload hint when successful.
 */
export async function completeMigrationToSupabase(): Promise<{
  ok: boolean;
  error?: string;
  verify?: VerifyResult;
  needsReload?: boolean;
}> {
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
  await hydrateFromSupabase();
  return { ok: true, verify, needsReload: true };
}
