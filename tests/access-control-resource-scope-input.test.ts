import assert from 'node:assert/strict';
import test from 'node:test';
import {
  replaceAccessControlStaffRoleScopesBodySchema,
} from '@/lib/access-control/resource-scope-input';

test('accepts the supported RLS scope replacement payload', () => {
  const result = replaceAccessControlStaffRoleScopesBodySchema.safeParse({
    action: 'replace_role_resource_scopes',
    roleCode: 'sales',
    scopes: [
      { resourceCode: 'customers', action: 'read', scope: 'own' },
      { resourceCode: 'customers', action: 'write', scope: 'own' },
      { resourceCode: 'bookings', action: 'read', scope: 'all' },
    ],
  });

  assert.equal(result.success, true);
});

test('rejects unknown resources, scopes, and duplicate resource actions', () => {
  for (const scopes of [
    [{ resourceCode: 'finance', action: 'read', scope: 'own' }],
    [{ resourceCode: 'bookings', action: 'read', scope: 'assigned' }],
    [{ resourceCode: 'customers', action: 'read', scope: 'team' }],
    [
      { resourceCode: 'customers', action: 'read', scope: 'own' },
      { resourceCode: 'customers', action: 'read', scope: 'all' },
    ],
  ]) {
    const result = replaceAccessControlStaffRoleScopesBodySchema.safeParse({
      action: 'replace_role_resource_scopes',
      roleCode: 'sales',
      scopes,
    });

    assert.equal(result.success, false);
  }
});
