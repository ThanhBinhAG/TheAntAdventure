import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('staff role deletion migration preserves database-level safety rules', () => {
  const migration = readProjectFile(
    'supabase/migrations/20260807122000_add_staff_role_delete.sql',
  );

  // Đây là regression test cho hợp đồng SQL: UI/API bị bypass thì RPC và FK
  // vẫn không cho xóa role hệ thống hoặc role còn nhân viên được gán.
  assert.match(migration, /on delete restrict/i);
  assert.match(migration, /if not public\.has_permission\('users\.manage'\)/);
  assert.match(migration, /and is_system = false/);
  assert.match(
    migration,
    /from public\.user_roles[\s\S]+where role_code = target_role_code/,
  );
  assert.match(migration, /'staff_role_deleted'/);
  assert.match(migration, /grant execute on function public\.delete_access_control_staff_role\(text\)\s+to authenticated/i);
});
