import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('staff-role reads use Redis cache and all relevant writes invalidate it', () => {
  const cache = readFileSync(
    join(process.cwd(), 'lib/redis/access-control-staff-roles.ts'),
    'utf8'
  );
  const server = readFileSync(join(process.cwd(), 'lib/access-control/server.ts'), 'utf8');

  assert.match(cache, /cache:access-control:staff-roles/);
  assert.match(cache, /STAFF_ROLES_CACHE_TTL_SECONDS = 5 \* 60/);
  assert.match(server, /const cached = await getCachedAccessControlStaffRoles\(\);/);
  assert.match(server, /await setCachedAccessControlStaffRoles\(roles\);/);

  const invalidations = server.match(/await invalidateAccessControlStaffRolesCache\(\);/g) ?? [];
  assert.equal(invalidations.length, 5);
});
