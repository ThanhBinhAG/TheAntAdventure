import { withoutAutoSyncAsync } from './auto-sync';
import { pushSnapshotToSupabase } from './sync-push';
import { isRemoteDataEnabled, isRemoteDataEnabled as remoteEnabled } from '../env';
import { useStore } from '../store';
import type { BackupData, ChatMessages } from '../types';
import {
  countBackupRows,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  TABLE_TO_STORE_KEY,
} from './sync-config';
import { db as supabaseDb } from './supabase';
import { withTimeout } from './timeout';

export { isRemoteDataEnabled } from '../env';

const STORAGE_KEY = 'ant-crm-v43';
const HYDRATE_TIMEOUT_MS = 12_000;
const PING_TIMEOUT_MS = 8_000;

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

  for (const [key, value] of results) {
    if (key === 'messages') {
      if (value && typeof value === 'object' && Object.keys(value).length > 0) {
        backup.messages = value as ChatMessages;
        totalRows += Object.keys(value).length;
      }
    } else if (Array.isArray(value) && value.length > 0) {
      (backup as Record<string, unknown>)[key] = value;
      totalRows += value.length;
    }
  }

  return totalRows > 0 ? backup : null;
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

export async function hydrateFromSupabase(): Promise<boolean> {
  if (!remoteEnabled()) return false;

  try {
    const remote = await withTimeout(fetchRemoteBackup(), HYDRATE_TIMEOUT_MS, null);
    if (!remote) return false;

    await withoutAutoSyncAsync(async () => {
      const state = useStore.getState();
      state.importBackup({
        ...state.exportBackup(),
        ...remote,
        exportedAt: new Date().toISOString(),
        version: '4.3',
      });
    });
    return true;
  } catch (e) {
    console.warn('[CRM] Supabase hydrate failed, using local store:', e);
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
  const push = await pushSnapshotToSupabase();
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

  clearLocalPersistedData();
  await hydrateFromSupabase();
  return { ok: true, verify, needsReload: true };
}
