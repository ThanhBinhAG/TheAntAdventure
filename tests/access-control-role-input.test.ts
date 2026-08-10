import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accessControlRoleUpdateBodySchema,
} from '../lib/access-control/role-input';

const userId = '6ad2d511-7c80-4ccc-9297-4e257c36e130';

describe('access-control role request input', () => {
  it('accepts assigning a valid dynamic role to a user', () => {
    const result = accessControlRoleUpdateBodySchema.safeParse({
      action: 'set_user_role',
      userId,
      roleCode: 'tour_operator',
    });

    assert.equal(result.success, true);
  });

  it('rejects malformed user ids and role codes before calling the RPC', () => {
    for (const input of [
      { action: 'set_user_role', userId: 'not-a-uuid', roleCode: 'sales' },
      { action: 'set_user_role', userId, roleCode: 'Sales' },
      { action: 'set_user_role', userId, roleCode: 'a' },
    ]) {
      assert.equal(
        accessControlRoleUpdateBodySchema.safeParse(input).success,
        false,
      );
    }
  });

  it('only permits replacing the employee permission catalog', () => {
    assert.equal(
      accessControlRoleUpdateBodySchema.safeParse({
        action: 'replace_role_permissions',
        roleCode: 'employee',
        permissionCodes: ['dashboard.read'],
      }).success,
      true,
    );

    for (const roleCode of ['admin', 'super_admin', 'sales']) {
      assert.equal(
        accessControlRoleUpdateBodySchema.safeParse({
          action: 'replace_role_permissions',
          roleCode,
          permissionCodes: ['dashboard.read'],
        }).success,
        false,
      );
    }
  });
});
