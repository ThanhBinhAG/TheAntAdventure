import { appLog } from '../../system/app-logger';
import { isRemoteDataEnabled as remoteEnabled } from '../../env';
import { useStore } from '../../store';
import { clearRouteCache } from '../route-cache';
import {
  countBackupRows,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  SYNC_HYDRATE_WAVES,
} from '../sync-config';
import {
  getHydratedTables,
  isMessagesHydrated,
  isTableHydrated,
  markHydrationFailed,
  markHydrationPending,
  updateBaselineCounts,
} from '../sync-lifecycle';
import { pushSnapshotToSupabase } from '../sync-push';
import { checkSupabaseConnection } from './connection';
import {
  ensureMessagesLoaded,
  ensurePageBootLoaded,
  ensureTablesLoaded,
} from './page-boot';
import { persistRouteCache } from './route-persist';
import { markReadyFromStore, resetShellHydrateGuard } from './shared';

const STORAGE_KEY = 'ant-crm-v43';

export type VerifyResult = {
  ok: boolean;
  local: Record<string, number>;
  remote: Record<string, number>;
  mismatches: string[];
};

/** @deprecated Use ensurePageBootLoaded â€” kept for callers during migration. */
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
