import type { SyncArrayTable } from './sync-config';

/** Tables whose browser mutations must go through their feature BFF routes. */
export const BFF_MANAGED_TABLES = new Set<SyncArrayTable>([
  'customers',
  'agents',
  'leads',
  'comms',
  'bookings',
  'products',
  'product_pricing',
  'tasks',
  'attractions',
  'tour_drafts',
  'tour_outline_days',
]);

/** Preserves the input table union so callers like `StoreRowPatch` indexing stay typed. */
export function filterBffManagedTables<T extends SyncArrayTable>(
  tables: readonly T[],
): T[] {
  return tables.filter((table) => !BFF_MANAGED_TABLES.has(table));
}
