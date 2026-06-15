/**
 * Export default seed data as CRM backup JSON + Supabase SQL import file.
 * Usage: npm run supabase:export-seeds
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { backupToSql } from './backup-to-supabase-sql.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Dynamic import of TypeScript seeds (Node 20+ / tsx)
async function loadSeedBackup() {
  const { seedStateForExport } = await import('../lib/db/seed-export.ts');
  return seedStateForExport();
}

async function main() {
  const backup = await loadSeedBackup();
  backup.exportedAt = new Date().toISOString();
  backup.version = '4.3';

  const outDir = path.join(root, 'supabase');
  const jsonPath = path.join(outDir, 'seed-backup.json');
  const sqlPath = path.join(outDir, 'import-full-data.sql');

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2), 'utf8');

  const { sql, stats } = backupToSql(backup);
  fs.writeFileSync(sqlPath, sql, 'utf8');

  console.log('✓ Wrote', jsonPath);
  console.log('✓ Wrote', sqlPath);
  console.log('\nRow counts:');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k}: ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
