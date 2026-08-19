import { isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { invalidateProductFacetsFromClient } from '../products/product-facets-client';
import { useStore } from '../store';
import type { BackupData, Comm, Customer, Lead } from '../types';
import {
  filterHydratedTables,
  getHydratedTables,
  isManualPushAllowed,
  isMessagesHydrated,
  isSyncAllowed,
  isTableHydrated,
  updateBaselineCounts,
} from './sync-lifecycle';
import type { SyncTableOptions, SyncTableResult } from './sync-policy';
import {
  countBackupRows,
  SYNC_PUSH_WAVES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import { db as supabaseDb } from './supabase';
import { upsertSimpleRows } from './supabase/generic-sync';
import { HANDLERS, type Row } from './supabase/shared';

export type StoreRowPatch = {
  customers?: Customer[];
  leads?: Lead[];
  comms?: Comm[];
};

const STORE_ROW_TABLES = ['customers', 'leads', 'comms'] as const satisfies readonly SyncArrayTable[];

export type PushOptions = {
  /** Bypass regression guard on mirror tables (catalogue tables stay upsert-only). */
  force?: boolean;
};

function syncErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message;
  }
  return 'Sync failed';
}

function resolveWaves(targetTables?: SyncArrayTable[]): SyncArrayTable[][] {
  const filter = targetTables ? new Set(targetTables) : null;
  return SYNC_PUSH_WAVES.map((wave) => (filter ? wave.filter((t) => filter.has(t)) : [...wave])).filter(
    (wave) => wave.length > 0
  );
}

async function syncTableFromBackup(
  table: SyncArrayTable,
  backup: BackupData,
  options: SyncTableOptions
): Promise<SyncTableResult> {
  if (table === 'products' || table === 'product_pricing') {
    return { skippedOrphanDelete: false };
  }
  const key = TABLE_TO_STORE_KEY[table];
  const rows = backup[key];
  const list = Array.isArray(rows) ? (rows as unknown as Record<string, unknown>[]) : [];
  return supabaseDb[table].syncTable(list, options);
}

export async function pushTablesToSupabase(
  tables?: SyncArrayTable[],
  includeMessages = true,
  options: PushOptions = {}
): Promise<{ ok: boolean; error?: string; counts?: Record<string, number>; warnings?: string[] }> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, error: 'Supabase not configured' };
  }
  if (isSupabaseReadOnly()) {
    return { ok: false, error: 'Supabase read-only mode — push disabled' };
  }
  if (
    !options.force &&
    tables === undefined &&
    !isSyncAllowed() &&
    !isManualPushAllowed()
  ) {
    return { ok: false, error: 'Hydrate not complete — sync blocked' };
  }

  try {
    const backup = useStore.getState().exportBackup();
    // Never push unhydrated tables (empty local arrays would wipe remote).
    const target =
      tables !== undefined ? filterHydratedTables(tables) : getHydratedTables();
    if (!target.length && !(includeMessages && isMessagesHydrated())) {
      return { ok: false, error: 'No hydrated tables to push' };
    }

    const waves = resolveWaves(target);
    const syncOptions: SyncTableOptions = { force: options.force };
    const warnings: string[] = [];

    for (const wave of waves) {
      const results = await Promise.all(
        wave.map(async (table) => {
          const result = await syncTableFromBackup(table, backup, syncOptions);
          if (result.skippedOrphanDelete && result.warning) warnings.push(result.warning);
        })
      );
      void results;
    }

    if (includeMessages && isMessagesHydrated() && Object.keys(backup.messages ?? {}).length) {
      const msgResult = await supabaseDb.messages.upsert(backup.messages, syncOptions);
      if (msgResult.skippedOrphanDelete && msgResult.warning) warnings.push(msgResult.warning);
    }

    if (options.force && warnings.length === 0) {
      updateBaselineCounts(countBackupRows(backup));
    }

    if (target.includes('products') || target.includes('product_pricing')) {
      await invalidateProductFacetsFromClient();
    }

    return { ok: true, counts: countBackupRows(backup), warnings: warnings.length ? warnings : undefined };
  } catch (e) {
    return { ok: false, error: syncErrorMessage(e) };
  }
}

/** Push only currently hydrated tables (+ messages if loaded). Call ensureAllTablesLoaded first for a full snapshot. */
export async function pushSnapshotToSupabase(options: PushOptions = {}) {
  return pushTablesToSupabase(undefined, true, options);
}

/** Upsert a small store slice (create/edit) — no orphan delete, no full-table POST. */
export async function pushStoreRowsToSupabase(
  patch: StoreRowPatch
): Promise<{ ok: boolean; error?: string }> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, error: 'Supabase not configured' };
  }
  if (isSupabaseReadOnly()) {
    return { ok: false, error: 'Supabase read-only mode — push disabled' };
  }

  try {
    for (const table of STORE_ROW_TABLES) {
      const rows = patch[table];
      if (!rows?.length) continue;
      if (!isTableHydrated(table)) continue;
      await upsertSimpleRows(HANDLERS[table], rows as unknown as Row[]);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: syncErrorMessage(e) };
  }
}
