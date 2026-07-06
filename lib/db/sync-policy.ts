import { getBaselineCount } from './sync-lifecycle';
import { type SyncArrayTable } from './sync-config';

export type TableSyncPolicy = 'upsertOnly' | 'mirrorGuarded';

/** Fraction of baseline rows required before orphan-delete is allowed. */
export const REGRESSION_THRESHOLD = 0.9;

const UPSERT_ONLY_TABLES = new Set<SyncArrayTable>(['products', 'product_pricing']);

export function getTablePolicy(table: SyncArrayTable): TableSyncPolicy {
  if (UPSERT_ONLY_TABLES.has(table)) return 'upsertOnly';
  return 'mirrorGuarded';
}

export type SyncTableOptions = {
  /** Bypass regression guard (not upsertOnly tables). */
  force?: boolean;
};

export type SyncTableResult = {
  skippedOrphanDelete: boolean;
  warning?: string;
};

export function shouldSkipOrphanDelete(
  table: SyncArrayTable,
  localCount: number,
  force = false
): boolean {
  if (getTablePolicy(table) === 'upsertOnly') return true;

  if (force) return false;

  const baseline = getBaselineCount(table);
  if (baseline <= 0) return false;

  return localCount < baseline * REGRESSION_THRESHOLD;
}

export function buildOrphanSkipWarning(table: SyncArrayTable, localCount: number): string {
  const baseline = getBaselineCount(table);
  return `${table}: local=${localCount}, baseline=${baseline} — skipped orphan delete to protect data`;
}
