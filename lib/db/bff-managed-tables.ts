import type { SyncArrayTable } from './sync-config';

/** Tables whose browser mutations must go through their feature BFF routes. */
export const BFF_MANAGED_TABLES = new Set<SyncArrayTable>([
  'customers',
  'agents',
  'products',
  'product_pricing',
  'tasks',
  'attractions',
  'tour_drafts',
  'tour_outline_days',
]);

export function filterBffManagedTables(tables: readonly SyncArrayTable[]): SyncArrayTable[] {
  return tables.filter((table) => !BFF_MANAGED_TABLES.has(table));
}
