import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Role & quyền does not render technical permission codes', () => {
  const source = readFileSync(
    join(process.cwd(), 'components/access-control/RolesPermissionsTab.tsx'),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /<code className=\{styles\.permissionCode\}>\{permission\.permission_code\}<\/code>/,
  );
});

test('permission catalog management is visible only to Super Admin', () => {
  const source = readFileSync(
    join(process.cwd(), 'components/access-control/RolesPermissionsTab.tsx'),
    'utf8',
  );

  assert.match(source, /const canCreatePermission = accessControlData\?\.canCreatePermission === true/);
  assert.match(source, /canCreatePermission && \(/);
  assert.match(source, /<PermissionCreateDrawer/);
  assert.match(source, /createAccessControlPermission\(input\)/);
});
