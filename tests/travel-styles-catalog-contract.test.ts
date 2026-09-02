import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL(
  '../supabase/migrations/20260902034328_add_travel_styles_catalog.sql',
  import.meta.url,
);

test('Travel Style catalog initializes active records and only permits customer writers to manage it', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create table if not exists public\.travel_styles/i);
  assert.match(sql, /is_active boolean not null default true/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /public\.has_permission\('customers\.write'\)/i);
});
