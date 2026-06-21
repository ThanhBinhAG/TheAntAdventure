import type { BackupData } from '../types';

/** v5 relational tables synced from Zustand arrays */
export const SYNC_ARRAY_TABLES = [
  'customers',
  'comms',
  'leads',
  'bookings',
  'agents',
  'guides',
  'products',
  'finance',
  'accounts_receivable',
  'accounts_payable',
  'tax_reports',
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
  'suppliers',
] as const;

export type SyncArrayTable = (typeof SYNC_ARRAY_TABLES)[number];

/** Maps Supabase v5 table name → Zustand / BackupData key */
export const TABLE_TO_STORE_KEY: Record<SyncArrayTable, keyof BackupData> = {
  customers: 'customers',
  comms: 'comms',
  leads: 'leads',
  bookings: 'bookings',
  agents: 'agents',
  guides: 'guides',
  products: 'products',
  finance: 'finance',
  accounts_receivable: 'ar',
  accounts_payable: 'ap',
  tax_reports: 'tax',
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
  suppliers: 'specialSuppliers',
};

export const MESSAGES_TABLE = 'chat_messages' as const;

/** Tables included in health-check row counts */
export const HEALTH_COUNT_TABLES = [
  ...SYNC_ARRAY_TABLES,
  'booking_itinerary',
  'booking_activities',
  MESSAGES_TABLE,
] as const;

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
  let msgCount = 0;
  for (const list of Object.values(backup.messages ?? {})) {
    if (Array.isArray(list)) msgCount += list.length;
  }
  counts[MESSAGES_TABLE] = msgCount;
  return counts;
}
