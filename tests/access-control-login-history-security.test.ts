import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function readProjectFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('login history remains guarded in both the UI and route handler', () => {
  const pageSource = readProjectFile(
    'components/access-control/AccessControlPage.tsx',
  );
  const routeSource = readProjectFile(
    'app/api/access-control/login-history/route.ts',
  );

  // UI default deny: chỉ đúng Super Admin mới có tab.
  assert.match(
    pageSource,
    /superAdminStatus\?\.isSuperAdmin === true/,
  );
  assert.match(pageSource, /\.\.\.\(canViewLoginHistory/);

  // API/RPC defense-in-depth: không chỉ ẩn giao diện rồi tin client.
  assert.match(routeSource, /isCurrentAccessControlSuperAdmin\(\)/);
  assert.match(routeSource, /status:\s*403/);
  assert.match(routeSource, /Cache-Control': 'no-store'/);
});
