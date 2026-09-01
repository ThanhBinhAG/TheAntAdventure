import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  'supabase/migrations/20260816090911_add_access_control_resource_scopes.sql',
  'utf8',
);

test('role scope management is RPC-only and records scope audits', () => {
  assert.match(sql, /has_permission\('users\.manage'\)/i);
  assert.match(sql, /replace_access_control_staff_role_resource_scopes/i);
  assert.match(sql, /staff_role_resource_scopes_replaced/i);
  assert.match(sql, /having count\(\*\) > 1/i);
  assert.match(sql, /revoke all on function public\.replace_access_control_staff_role_resource_scopes/i);
});

test('core record ownership columns can only change through audited RPCs', () => {
  assert.match(sql, /protect_core_record_access_columns/i);
  assert.match(sql, /app\.allow_core_record_access_change/i);
  assert.match(sql, /core_record_owner_reassigned/i);
  assert.match(sql, /trg_tasks_protect_access_columns/i);
});
