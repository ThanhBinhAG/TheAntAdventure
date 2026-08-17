import { isRemoteDataEnabled } from '../env';
import { type SyncArrayTable } from './sync-config';

export type HydrationPhase = 'pending' | 'ready' | 'failed';

export type HydrationState = {
  phase: HydrationPhase;
  error: string | null;
  baselineCounts: Partial<Record<SyncArrayTable, number>>;
  hydratedTables: SyncArrayTable[];
  messagesHydrated: boolean;
};

const listeners = new Set<(state: HydrationState) => void>();

const hydratedTables = new Set<SyncArrayTable>();
let messagesHydrated = false;

let hydrationState: HydrationState = {
  phase: 'pending',
  error: null,
  baselineCounts: {},
  hydratedTables: [],
  messagesHydrated: false,
};

function emit() {
  listeners.forEach((fn) => fn(hydrationState));
}

function setState(patch: Partial<HydrationState>) {
  hydrationState = { ...hydrationState, ...patch };
  emit();
}

function snapshotHydrated() {
  return {
    hydratedTables: [...hydratedTables] as SyncArrayTable[],
    messagesHydrated,
  };
}

export function getHydrationState(): HydrationState {
  return hydrationState;
}

export function subscribeHydration(listener: (state: HydrationState) => void) {
  listeners.add(listener);
  listener(hydrationState);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hard reset — clears hydrated flags (app start, full re-hydrate).
 * Do not call on route navigation; use {@link markHydrationSoftPending}.
 */
export function markHydrationPending() {
  hydratedTables.clear();
  messagesHydrated = false;
  setState({
    phase: 'pending',
    error: null,
    baselineCounts: {},
    ...snapshotHydrated(),
  });
}

/**
 * Soft pending for route boot: sets phase=pending without wiping hydratedTables.
 * Preserves cross-route cache so nav mid-boot does not force duplicate GETs / empty auto-sync.
 */
export function markHydrationSoftPending() {
  setState({
    phase: 'pending',
    error: null,
    ...snapshotHydrated(),
  });
}

export function markHydrationReady(baselineCounts: Partial<Record<SyncArrayTable, number>>) {
  setState({
    phase: 'ready',
    error: null,
    baselineCounts: { ...baselineCounts },
    ...snapshotHydrated(),
  });
}

export function markHydrationFailed(error: string) {
  setState({ phase: 'failed', error, ...snapshotHydrated() });
}

export function updateBaselineCounts(counts: Partial<Record<SyncArrayTable, number>>) {
  setState({
    baselineCounts: { ...hydrationState.baselineCounts, ...counts },
    ...snapshotHydrated(),
  });
}

export function markTablesHydrated(tables: readonly SyncArrayTable[]) {
  for (const table of tables) hydratedTables.add(table);
  setState(snapshotHydrated());
}

export function markMessagesHydrated() {
  messagesHydrated = true;
  setState(snapshotHydrated());
}

export function isTableHydrated(table: SyncArrayTable): boolean {
  return hydratedTables.has(table);
}

export function isMessagesHydrated(): boolean {
  return messagesHydrated;
}

export function getHydratedTables(): SyncArrayTable[] {
  return [...hydratedTables];
}

export function filterHydratedTables(tables: readonly SyncArrayTable[]): SyncArrayTable[] {
  return tables.filter((t) => hydratedTables.has(t));
}

export function getBaselineCount(table: SyncArrayTable): number {
  return hydrationState.baselineCounts[table] ?? 0;
}

/** Auto-sync only runs after a successful hydrate (shell or full). */
export function isSyncAllowed(): boolean {
  if (!isRemoteDataEnabled()) return false;
  return hydrationState.phase === 'ready';
}

/** Manual push allowed when hydrated or hydrate failed (user must confirm). */
export function isManualPushAllowed(): boolean {
  if (!isRemoteDataEnabled()) return false;
  return hydrationState.phase === 'ready' || hydrationState.phase === 'failed';
}
