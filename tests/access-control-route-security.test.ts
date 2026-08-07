import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Access Control mutation routes retain their permission checks and contracts', () => {
  const routes = [
    ['app/api/access-control/route.ts', 'accessControlRoleUpdateBodySchema'],
    ['app/api/access-control/users/route.ts', 'accessControlUserUpdateBodySchema'],
    ['app/api/access-control/staff-roles/route.ts', 'updateAccessControlStaffRoleBodySchema'],
  ] as const;

  for (const [path, schema] of routes) {
    const source = readProjectFile(path);
    // Regression guard: route không được tin UI; tất cả thao tác đều kiểm tra
    // users.manage và validate request trước khi chuyển sang RPC.
    assert.match(source, /checkPermissionForRequest\(\s*'users\.manage'/);
    assert.match(source, new RegExp(`${schema}\\.safeParse\\(body\\)`));
    assert.match(source, /export const dynamic = 'force-dynamic'/);
  }
});

test('history routes keep server-side filters and authorization guards', () => {
  const auditSource = readProjectFile(
    'app/api/access-control/audit-logs/route.ts',
  );
  const loginSource = readProjectFile(
    'app/api/access-control/login-history/route.ts',
  );

  assert.match(auditSource, /accessControlAuditLogsQuerySchema\.safeParse/);
  assert.match(auditSource, /checkPermissionForRequest\(\s*'users\.manage'/);
  assert.match(loginSource, /parseAuthLoginHistoryQuery\(url\)/);
  assert.match(loginSource, /isCurrentAccessControlSuperAdmin\(\)/);
  assert.match(loginSource, /status:\s*403/);
});

test('Access Control routes use the structured error contract', () => {
  const routes = [
    'app/api/access-control/route.ts',
    'app/api/access-control/users/route.ts',
    'app/api/access-control/staff-roles/route.ts',
    'app/api/access-control/audit-logs/route.ts',
    'app/api/access-control/login-history/route.ts',
    'app/api/access-control/super-admin-status/route.ts',
  ];

  for (const path of routes) {
    const source = readProjectFile(path);
    assert.match(source, /accessControlError\(/);
  }
});
