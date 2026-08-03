import { isRemoteDataEnabled } from '../env';
import { type SyncArrayTable } from './sync-config';

export type HydrationPhase = 'pending' | 'ready' | 'failed';

export type HydrationState = {
  phase: HydrationPhase;
  error: string | null;
  baselineCounts: Partial<Record<SyncArrayTable, number>>;
};

const listeners = new Set<(state: HydrationState) => void>();

let hydrationState: HydrationState = {
  phase: 'pending',
  error: null,
  baselineCounts: {},
};

function emit() {
  listeners.forEach((fn) => fn(hydrationState));
}

function setState(patch: Partial<HydrationState>) {
  hydrationState = { ...hydrationState, ...patch };
  emit();
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

export function markHydrationPending() {
  setState({ phase: 'pending', error: null });
}

export function markHydrationReady(baselineCounts: Partial<Record<SyncArrayTable, number>>) {
  setState({ phase: 'ready', error: null, baselineCounts: { ...baselineCounts } });
}

export function markHydrationFailed(error: string) {
  setState({ phase: 'failed', error });
}

export function updateBaselineCounts(counts: Partial<Record<SyncArrayTable, number>>) {
  setState({ baselineCounts: { ...hydrationState.baselineCounts, ...counts } });
}

export function getBaselineCount(table: SyncArrayTable): number {
  return hydrationState.baselineCounts[table] ?? 0;
}

/** Auto-sync only runs after a successful hydrate. */
export function isSyncAllowed(): boolean {
  if (!isRemoteDataEnabled()) return false;
  return hydrationState.phase === 'ready';
}

/** Manual push allowed when hydrated or hydrate failed (user must confirm). */
export function isManualPushAllowed(): boolean {
  if (!isRemoteDataEnabled()) return false;
  return hydrationState.phase === 'ready' || hydrationState.phase === 'failed';
}
