import { isAutoSyncEnabled, isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { TABLE_TO_STORE_KEY, SYNC_ARRAY_TABLES, type SyncArrayTable } from './sync-config';
import { isSyncAllowed, subscribeHydration } from './sync-lifecycle';
import { pushSnapshotToSupabase, pushTablesToSupabase } from './sync-push';

export type AutoSyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error' | 'blocked';

export type AutoSyncState = {
  status: AutoSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const DEBOUNCE_MS = 2500;

let suppressCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let pendingAfterFlight = false;
let pendingTables: Set<SyncArrayTable> = new Set();
let pendingMessages = false;
let hydrationListenerReady = false;

const listeners = new Set<(state: AutoSyncState) => void>();

let syncState: AutoSyncState = {
  status: 'idle',
  lastSyncedAt: null,
  lastError: null,
};

function emit() {
  listeners.forEach((fn) => fn(syncState));
}

function setSyncState(patch: Partial<AutoSyncState>) {
  syncState = { ...syncState, ...patch };
  emit();
}

export function getAutoSyncState() {
  return syncState;
}

export function subscribeAutoSync(listener: (state: AutoSyncState) => void) {
  listeners.add(listener);
  listener(syncState);
  return () => {
    listeners.delete(listener);
  };
}

/** Skip auto-sync while hydrating / importing from remote */
export async function withoutAutoSyncAsync<T>(fn: () => Promise<T>): Promise<T> {
  suppressCount++;
  try {
    return await fn();
  } finally {
    suppressCount--;
  }
}

function canAutoSync() {
  return (
    suppressCount === 0 &&
    isRemoteDataEnabled() &&
    isAutoSyncEnabled() &&
    !isSupabaseReadOnly() &&
    isSyncAllowed()
  );
}

function queueDebouncedFlush() {
  setSyncState({ status: 'pending', lastError: null });
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushAutoSync();
  }, DEBOUNCE_MS);
}

function ensureHydrationListener() {
  if (hydrationListenerReady) return;
  hydrationListenerReady = true;
  subscribeHydration((state) => {
    if (state.phase === 'ready' && (pendingTables.size > 0 || pendingMessages)) {
      if (!isRemoteDataEnabled() || !isAutoSyncEnabled() || isSupabaseReadOnly()) return;
      queueDebouncedFlush();
    }
  });
}

/** Queue sync for specific tables (debounced) */
export function scheduleAutoSync(changed?: { tables?: SyncArrayTable[]; messages?: boolean }) {
  ensureHydrationListener();
  if (!isRemoteDataEnabled() || !isAutoSyncEnabled() || isSupabaseReadOnly()) return;

  if (changed?.tables) changed.tables.forEach((t) => pendingTables.add(t));
  if (changed?.messages) pendingMessages = true;
  if (!changed) {
    pendingTables = new Set();
    pendingMessages = true;
  }

  if (!isSyncAllowed()) {
    setSyncState({
      status: 'blocked',
      lastError: 'Đang chờ tải dữ liệu từ Supabase — sync tạm dừng',
    });
    return;
  }

  if (!canAutoSync()) return;

  queueDebouncedFlush();
}

async function flushAutoSync() {
  if (!canAutoSync()) return;

  if (syncInFlight) {
    pendingAfterFlight = true;
    return;
  }

  syncInFlight = true;
  setSyncState({ status: 'syncing', lastError: null });

  const tables = pendingTables.size ? [...pendingTables] : undefined;
  const messages = pendingMessages;
  pendingTables = new Set();
  pendingMessages = false;

  try {
    const result = tables || messages
      ? await pushTablesToSupabase(tables, messages)
      : await pushSnapshotToSupabase();

    if (result.ok) {
      setSyncState({
        status: result.warnings?.length ? 'blocked' : 'synced',
        lastSyncedAt: new Date().toLocaleTimeString(),
        lastError: result.warnings?.length ? result.warnings.join('; ') : null,
      });
    } else {
      setSyncState({ status: 'error', lastError: result.error ?? 'Sync failed' });
    }
  } catch (e) {
    setSyncState({
      status: 'error',
      lastError: e instanceof Error ? e.message : 'Sync failed',
    });
  } finally {
    syncInFlight = false;
    if (pendingAfterFlight || pendingTables.size || pendingMessages) {
      pendingAfterFlight = false;
      void flushAutoSync();
    }
  }
}

/** Compare Zustand snapshots — return changed table names */
export function detectChangedTables(
  state: Record<string, unknown>,
  prev: Record<string, unknown>
): { tables: SyncArrayTable[]; messages: boolean } {
  const tables: SyncArrayTable[] = [];

  for (const table of SYNC_ARRAY_TABLES) {
    const key = TABLE_TO_STORE_KEY[table];
    if (state[key] !== prev[key]) tables.push(table);
  }

  return { tables, messages: state.messages !== prev.messages };
}