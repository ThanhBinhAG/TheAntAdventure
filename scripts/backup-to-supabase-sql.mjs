/**
 * Shared logic for backup JSON → Supabase SQL (used by CLI script).
 * Keep in sync with lib/db/sync-config.ts table names.
 */
import { pathToFileURL } from 'url';

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
];

export const TABLE_TO_BACKUP_KEY = {
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

export const MESSAGES_TABLE = 'crm_messages';
export const MESSAGES_ROW_ID = 'default';

export function getRowId(row, table, index) {
  if (row.id != null && String(row.id).length > 0) return String(row.id);
  if (table === 'products' && row.code != null) return String(row.code);
  return `${table}-${index}`;
}

export function sqlEscapeJson(obj) {
  return JSON.stringify(obj).replace(/'/g, "''");
}

function upsertStatement(table, id, dataJson) {
  return (
    `INSERT INTO ${table} (id, data, updated_at) VALUES ` +
    `('${String(id).replace(/'/g, "''")}', '${dataJson}'::jsonb, now()) ` +
    `ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;`
  );
}

/**
 * @param {Record<string, unknown>} backup — CRM backup JSON (exportBackup shape)
 * @returns {string} SQL script
 */
export function backupToSql(backup) {
  const lines = [
    '-- The Ant Adventures CRM — full data import',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Source export: ${backup.exportedAt ?? 'unknown'}`,
    '-- Run in Supabase SQL Editor AFTER schema.sql',
    '',
    'BEGIN;',
    '',
  ];

  const stats = {};

  for (const table of SYNC_ARRAY_TABLES) {
    const key = TABLE_TO_BACKUP_KEY[table];
    const rows = backup[key];
    if (!Array.isArray(rows) || !rows.length) continue;

    lines.push(`-- ${table}: ${rows.length} rows`);
    stats[table] = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = getRowId(row, table, i);
      const payload = { ...row, id };
      lines.push(upsertStatement(table, id, sqlEscapeJson(payload)));
    }
    lines.push('');
  }

  if (backup.messages && typeof backup.messages === 'object' && Object.keys(backup.messages).length) {
    const channelCount = Object.keys(backup.messages).length;
    lines.push(`-- ${MESSAGES_TABLE}: ${channelCount} channels`);
    stats[MESSAGES_TABLE] = channelCount;
    lines.push(
      upsertStatement(MESSAGES_TABLE, MESSAGES_ROW_ID, sqlEscapeJson(backup.messages))
    );
    lines.push('');
  }

  lines.push('COMMIT;', '');
  lines.push('-- Row counts imported:');
  for (const [k, v] of Object.entries(stats)) {
    lines.push(`--   ${k}: ${v}`);
  }

  return { sql: lines.join('\n'), stats };
}

// CLI: node scripts/backup-to-supabase-sql.mjs <backup.json> [output.sql]

const isCli =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    process.argv[1].endsWith('backup-to-supabase-sql.mjs'));

if (isCli) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node scripts/backup-to-supabase-sql.mjs <backup.json> [output.sql]');
    process.exit(1);
  }
  const fs = await import('fs');
  const path = await import('path');
  const raw = fs.readFileSync(input, 'utf8');
  const backup = JSON.parse(raw);
  const { sql, stats } = backupToSql(backup);
  const out = process.argv[3] || path.join(path.dirname(input), 'import-full-data.sql');
  fs.writeFileSync(out, sql, 'utf8');
  console.log('✓ Wrote', out);
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
}
