import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/20260821110000_add_catalogue_aggregate_transactions.sql');

test('Product and Attraction aggregate RPCs retain the atomic write boundary', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /function public\.save_product_aggregate/i);
  assert.match(sql, /insert into public\.product_pricing/i);
  assert.match(sql, /on conflict \(product_code\) do nothing/i);
  assert.match(sql, /delete from public\.product_photos where product_code = v_code/i);
  assert.match(sql, /function public\.save_attraction_aggregate/i);
  assert.match(sql, /delete from public\.attraction_photos where attraction_id = v_id/i);
  assert.match(sql, /grant execute on function public\.save_product_aggregate\(jsonb, jsonb, jsonb\) to authenticated/i);
  assert.match(sql, /grant execute on function public\.save_attraction_aggregate\(jsonb, jsonb\) to authenticated/i);
});
