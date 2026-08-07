import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createAccessControlStaffRoleBodySchema,
  deleteAccessControlStaffRoleBodySchema,
  updateAccessControlStaffRoleBodySchema,
} from '../lib/access-control/staff-role-input';

describe('access-control staff role request input', () => {
  it('applies the default display order when creating a valid role', () => {
    const result = createAccessControlStaffRoleBodySchema.safeParse({
      code: 'tour_operator',
      label: 'Điều hành tour',
      description: '  Quản lý tour  ',
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        code: 'tour_operator',
        label: 'Điều hành tour',
        description: 'Quản lý tour',
        sortOrder: 0,
      });
    }
  });

  it('rejects invalid role metadata and oversized permission replacement', () => {
    const tooManyPermissions = Array.from(
      { length: 101 },
      (_, index) => `reports_${index}.read`,
    );

    for (const input of [
      { code: 'tour-operator', label: 'Điều hành' },
      { code: 'sales', label: ' ' },
      { code: 'sales', label: 'Sale', sortOrder: -1 },
      {
        action: 'replace_role_permissions',
        roleCode: 'sales',
        permissionCodes: tooManyPermissions,
      },
    ]) {
      const schema = 'action' in input
        ? updateAccessControlStaffRoleBodySchema
        : createAccessControlStaffRoleBodySchema;
      assert.equal(schema.safeParse(input).success, false);
    }
  });

  it('accepts both supported PATCH actions and validates DELETE payloads', () => {
    assert.equal(
      updateAccessControlStaffRoleBodySchema.safeParse({
        action: 'update_role',
        code: 'sales',
        label: 'Bán hàng',
        sortOrder: 40,
        isActive: true,
      }).success,
      true,
    );
    assert.equal(
      updateAccessControlStaffRoleBodySchema.safeParse({
        action: 'replace_role_permissions',
        roleCode: 'sales',
        permissionCodes: ['sales.read', 'sales.write'],
      }).success,
      true,
    );
    assert.equal(
      deleteAccessControlStaffRoleBodySchema.safeParse({
        code: 'sales',
      }).success,
      true,
    );
    assert.equal(
      deleteAccessControlStaffRoleBodySchema.safeParse({
        code: 'sales role',
      }).success,
      false,
    );
  });
});
