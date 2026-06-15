import type { BackupData } from '../types';

/** Array tables — one Supabase table per BackupData array field */
export const SYNC_ARRAY_TABLES = [
  'customers',
  'comms',
  'leads',
  'bookings',
  'agents',
  'guides',
  'products',
  'finance',
  'ar',
  'ap',
  'tax',
  'staff',
  'tasks',
  'feedback',
  'contracts',
  'photos',
  'cal_events',
  'dev_notes',
  'cruises',
  'transport',
  'restaurants',
  'special_suppliers',
] as const;

export type SyncArrayTable = (typeof SYNC_ARRAY_TABLES)[number];

/** Maps Supabase table name → Zustand / BackupData key */
export const TABLE_TO_STORE_KEY: Record<SyncArrayTable, keyof BackupData> = {
  customers: 'customers',
  comms: 'comms',
  leads: 'leads',
  bookings: 'bookings',
  agents: 'agents',
  guides: 'guides',
  products: 'products',
  finance: 'finance',
  ar: 'ar',
  ap: 'ap',
  tax: 'tax',
  staff: 'staff',
  tasks: 'tasks',
  feedback: 'feedback',
  contracts: 'contracts',
  photos: 'photos',
  cal_events: 'calEvents',
  dev_notes: 'devNotes',
  cruises: 'cruises',
  transport: 'transport',
  restaurants: 'restaurants',
  special_suppliers: 'specialSuppliers',
};

export const MESSAGES_TABLE = 'crm_messages' as const;
export const MESSAGES_ROW_ID = 'default' as const;

export function getRowId(row: Record<string, unknown>, table: SyncArrayTable, index: number): string {
  if (row.id != null && String(row.id).length > 0) return String(row.id);
  if (table === 'products' && row.code != null) return String(row.code);
  return `${table}-${index}`;
}

export function countBackupRows(backup: BackupData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of SYNC_ARRAY_TABLES) {
    const key = TABLE_TO_STORE_KEY[table];
    const rows = backup[key];
    counts[table] = Array.isArray(rows) ? rows.length : 0;
  }
  counts[MESSAGES_TABLE] = Object.keys(backup.messages ?? {}).length;
  return counts;
}
