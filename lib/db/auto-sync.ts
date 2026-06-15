import { isAutoSyncEnabled, isRemoteDataEnabled } from '../env';
import type { BackupData } from '../types';
import { TABLE_TO_STORE_KEY, SYNC_ARRAY_TABLES, type SyncArrayTable } from './sync-config';
import { pushSnapshotToSupabase, pushTablesToSupabase } from './sync-push';

export type AutoSyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error';

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
export function withoutAutoSync<T>(fn: () => T): T {
  suppressCount++;
  try {
    return fn();
  } finally {
    suppressCount--;
  }
}

export async function withoutAutoSyncAsync<T>(fn: () => Promise<T>): Promise<T> {
  suppressCount++;
  try {
    return await fn();
  } finally {
    suppressCount--;
  }
}

function canAutoSync() {
  return suppressCount === 0 && isRemoteDataEnabled() && isAutoSyncEnabled();
}

/** Queue sync for specific tables (debounced) */
export function scheduleAutoSync(changed?: { tables?: SyncArrayTable[]; messages?: boolean }) {
  if (!canAutoSync()) return;

  if (changed?.tables) changed.tables.forEach((t) => pendingTables.add(t));
  if (changed?.messages) pendingMessages = true;
  if (!changed) {
    pendingTables = new Set();
    pendingMessages = true;
  }

  setSyncState({ status: 'pending', lastError: null });

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushAutoSync();
  }, DEBOUNCE_MS);
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
        status: 'synced',
        lastSyncedAt: new Date().toLocaleTimeString(),
        lastError: null,
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

/** Force immediate push (manual button) */
export async function flushAutoSyncNow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingTables = new Set();
  pendingMessages = true;
  await flushAutoSync();
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

export const SYNC_STORE_KEYS = Object.values(TABLE_TO_STORE_KEY) as (keyof BackupData)[];
