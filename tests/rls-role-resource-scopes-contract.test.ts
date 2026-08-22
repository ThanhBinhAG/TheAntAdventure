import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('RLS scope foundation stays policy-only and checks active user roles', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260816073345_add_role_resource_scopes.sql'), 'utf8');
  assert.match(sql, /create table public\.role_resource_scopes/i);
  assert.match(sql, /primary key \(role_code, resource_code, action\)/i);
  assert.match(sql, /revoke all on table public\.role_resource_scopes from anon, authenticated/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /p\.is_active = true[\s\S]+p\.deleted_at is null/i);
  assert.match(sql, /rrs\.scope = any\(accepted_scopes\)/i);
});
