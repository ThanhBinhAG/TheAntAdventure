import { isAutoSyncEnabled, isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { TABLE_TO_STORE_KEY, SYNC_ARRAY_TABLES, type SyncArrayTable } from './sync-config';
import { persistRouteCacheFromStore } from './hydrate/route-persist';
import {
  filterHydratedTables,
  getHydratedTables,
  isMessagesHydrated,
  isSyncAllowed,
  subscribeHydration,
} from './sync-lifecycle';
import { pushStoreRowsToSupabase, pushTablesToSupabase, type StoreRowPatch } from './sync-push';

export type ScheduleAutoSyncOptions = {
  /** Skip the 2.5s debounce and push queued tables immediately. */
  immediate?: boolean;
};

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

/** Queue sync for specific tables (debounced). Unhydrated tables are ignored. */
export function scheduleAutoSync(
  changed?: { tables?: SyncArrayTable[]; messages?: boolean },
  options?: ScheduleAutoSyncOptions
) {
  ensureHydrationListener();
  if (!isRemoteDataEnabled() || !isAutoSyncEnabled() || isSupabaseReadOnly()) return;
  // Seed merges during hydrate must not queue a push that flushes when phase becomes ready.
  if (suppressCount > 0) return;

  if (changed?.tables) {
    for (const t of filterHydratedTables(changed.tables)) pendingTables.add(t);
  }
  if (changed?.messages && isMessagesHydrated()) pendingMessages = true;
  if (!changed) {
    // Never push unhydrated empty arrays — only tables already in the store.
    pendingTables = new Set(getHydratedTables());
    pendingMessages = isMessagesHydrated();
  }

  if (!pendingTables.size && !pendingMessages) return;

  if (!isSyncAllowed()) {
    setSyncState({
      status: 'blocked',
      lastError: 'Đang chờ tải dữ liệu từ Supabase — sync tạm dừng',
    });
    return;
  }

  if (!canAutoSync()) return;

  if (options?.immediate) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void flushAutoSync();
    return;
  }

  queueDebouncedFlush();
}

export async function flushAutoSync() {
  if (!canAutoSync()) return;

  if (syncInFlight) {
    pendingAfterFlight = true;
    return;
  }

  syncInFlight = true;
  setSyncState({ status: 'syncing', lastError: null });

  const rawTables = pendingTables.size ? [...pendingTables] : getHydratedTables();
  const tables = filterHydratedTables(rawTables);
  const messages = pendingMessages && isMessagesHydrated();
  pendingTables = new Set();
  pendingMessages = false;

  if (!tables.length && !messages) {
    setSyncState({ status: 'idle', lastError: null });
    syncInFlight = false;
    return;
  }

  try {
    const result = await pushTablesToSupabase(tables, messages);

    if (result.ok) {
      // Keep session route cache in sync so F5 does not restore a pre-mutation snapshot.
      persistRouteCacheFromStore();
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

/** Drop queued tables (e.g. after a targeted row upsert) and cancel debounce if idle. */
export function clearPendingAutoSync(tables: readonly SyncArrayTable[]) {
  for (const t of tables) pendingTables.delete(t);
  if (!pendingTables.size && !pendingMessages && debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    if (syncState.status === 'pending') {
      setSyncState({ status: 'idle', lastError: null });
    }
  }
}

export function isAutoSyncDebouncePending() {
  return debounceTimer != null;
}

/**
 * Upsert only the given CRM rows immediately (create/edit customer).
 * Cancels a pending full-table debounce for those tables.
 */
export async function persistCustomerRowsNow(patch: StoreRowPatch) {
  const tables = (['customers', 'leads', 'comms'] as const).filter(
    (t) => Array.isArray(patch[t]) && (patch[t]?.length ?? 0) > 0
  );
  clearPendingAutoSync(tables);

  if (!canAutoSync()) {
    if (!isSyncAllowed()) {
      setSyncState({
        status: 'blocked',
        lastError: 'Đang chờ tải dữ liệu từ Supabase — sync tạm dừng',
      });
    }
    return { ok: false as const, error: 'Auto-sync not allowed' };
  }

  setSyncState({ status: 'syncing', lastError: null });
  const result = await pushStoreRowsToSupabase(patch);
  if (result.ok) {
    persistRouteCacheFromStore();
    setSyncState({
      status: 'synced',
      lastSyncedAt: new Date().toLocaleTimeString(),
      lastError: null,
    });
  } else {
    setSyncState({ status: 'error', lastError: result.error ?? 'Sync failed' });
  }
  return result;
}
