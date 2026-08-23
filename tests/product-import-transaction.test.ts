import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/20260821100600_add_product_catalogue_import_transaction.sql');

test('Product import RPC validates the aggregate before replacing its catalogue', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.replace_product_catalogue_transaction/i);
  assert.match(sql, /Imported product codes must be unique/);
  assert.match(sql, /Each imported product must have exactly one pricing stub/);
  assert.match(sql, /delete from public\.products;/);
  assert.match(sql, /insert into public\.products \(/);
  assert.match(sql, /insert into public\.product_pricing \(/);
  assert.match(sql, /grant execute on function public\.replace_product_catalogue_transaction\(jsonb, jsonb\) to authenticated;/i);
});
