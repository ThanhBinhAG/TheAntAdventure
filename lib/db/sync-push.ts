import { isRemoteDataEnabled } from '../env';
import { useStore } from '../store';
import {
  countBackupRows,
  SYNC_ARRAY_TABLES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import { db as supabaseDb } from './supabase';

export async function pushTablesToSupabase(
  tables?: SyncArrayTable[],
  includeMessages = true
): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const backup = useStore.getState().exportBackup();
    const targetTables = tables ?? [...SYNC_ARRAY_TABLES];

    await Promise.all([
      ...targetTables.map((table) => {
        const key = TABLE_TO_STORE_KEY[table];
        const rows = backup[key];
        const list = Array.isArray(rows) ? (rows as unknown as Record<string, unknown>[]) : [];
        return supabaseDb[table].syncTable(list);
      }),
      includeMessages && Object.keys(backup.messages ?? {}).length
        ? supabaseDb.messages.upsert(backup.messages)
        : Promise.resolve(),
    ]);

    return { ok: true, counts: countBackupRows(backup) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Sync failed' };
  }
}

export async function pushSnapshotToSupabase() {
  return pushTablesToSupabase(undefined, true);
}
