import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  'supabase/migrations/20260816083021_backfill_core_record_ownership.sql',
  'utf8',
);

test('ownership backfill accepts only exact, unambiguous active profile emails', () => {
  assert.match(sql, /lower\(btrim\(email\)\)/i);
  assert.match(sql, /having count\(\*\) = 1/i);
  assert.match(sql, /min\(id::text\)::uuid as user_id/i);
  assert.match(sql, /is_active = true/i);
  assert.match(sql, /deleted_at is null/i);
  assert.doesNotMatch(sql, /display_name/i);
});

test('ownership backfill preserves existing owners and inherits through core parents', () => {
  assert.match(sql, /owner_user_id is null/i);
  assert.match(sql, /from public\.customers c/i);
  assert.match(sql, /from public\.leads l/i);
  assert.match(sql, /tasks have no reliable legacy creator field/i);
  assert.match(sql, /RLS ownership backfill remaining nulls/i);
});
