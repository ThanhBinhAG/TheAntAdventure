import { isRemoteDataEnabled } from '../env';
import { useStore } from '../store';
import {
  countBackupRows,
  SYNC_PUSH_WAVES,
  TABLE_TO_STORE_KEY,
  type SyncArrayTable,
} from './sync-config';
import { db as supabaseDb } from './supabase';

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

async function syncTableFromBackup(table: SyncArrayTable, backup: ReturnType<typeof useStore.getState>['exportBackup']) {
  const key = TABLE_TO_STORE_KEY[table];
  const rows = backup[key];
  const list = Array.isArray(rows) ? (rows as unknown as Record<string, unknown>[]) : [];
  return supabaseDb[table].syncTable(list);
}

export async function pushTablesToSupabase(
  tables?: SyncArrayTable[],
  includeMessages = true
): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, error: 'Supabase not configured' };
  }

  try {
    const backup = useStore.getState().exportBackup();
    const waves = resolveWaves(tables);

    for (const wave of waves) {
      await Promise.all(wave.map((table) => syncTableFromBackup(table, backup)));
    }

    if (includeMessages && Object.keys(backup.messages ?? {}).length) {
      await supabaseDb.messages.upsert(backup.messages);
    }

    return { ok: true, counts: countBackupRows(backup) };
  } catch (e) {
    return { ok: false, error: syncErrorMessage(e) };
  }
}

export async function pushSnapshotToSupabase() {
  return pushTablesToSupabase(undefined, true);
}
