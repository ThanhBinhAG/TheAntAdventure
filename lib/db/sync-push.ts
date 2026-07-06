import { isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { useStore } from '../store';
import type { BackupData } from '../types';
import { isManualPushAllowed, isSyncAllowed, updateBaselineCounts } from './sync-lifecycle';
import type { SyncTableOptions } from './sync-policy';
import {
  countBackupRows,
  SYNC_PUSH_WAVES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import { db as supabaseDb } from './supabase';

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
) {
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
    const waves = resolveWaves(tables);
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

    if (includeMessages && Object.keys(backup.messages ?? {}).length) {
      const msgResult = await supabaseDb.messages.upsert(backup.messages, syncOptions);
      if (msgResult.skippedOrphanDelete && msgResult.warning) warnings.push(msgResult.warning);
    }

    if (options.force && warnings.length === 0) {
      updateBaselineCounts(countBackupRows(backup));
    }

    return { ok: true, counts: countBackupRows(backup), warnings: warnings.length ? warnings : undefined };
  } catch (e) {
    return { ok: false, error: syncErrorMessage(e) };
  }
}

export async function pushSnapshotToSupabase(options: PushOptions = {}) {
  return pushTablesToSupabase(undefined, true, options);
}
