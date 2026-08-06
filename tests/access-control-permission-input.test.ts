import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createAccessControlPermissionBodySchema,
} from '../lib/access-control/permission-input';

describe('access-control permission input', () => {
  const validInput = {
    code: 'reports.read',
    description: 'Xem báo cáo',
    groupCode: 'reports',
    groupLabel: 'Báo cáo',
  };

  it('accepts a permission in a new or existing group', () => {
    assert.equal(
      createAccessControlPermissionBodySchema.safeParse(validInput).success,
      true,
    );
  });

  it('rejects reserved and malformed permission codes', () => {
    for (const code of [
      '*',
      'users.manage',
      'reports',
      'Reports.read',
      'reports.read.more',
    ]) {
      assert.equal(
        createAccessControlPermissionBodySchema.safeParse({
          ...validInput,
          code,
        }).success,
        false,
        `Expected ${code} to be rejected`,
      );
    }
  });

  it('rejects an invalid group or missing display names', () => {
    for (const input of [
      { ...validInput, groupCode: 'reports-new' },
      { ...validInput, groupLabel: ' ' },
      { ...validInput, description: ' ' },
    ]) {
      assert.equal(
        createAccessControlPermissionBodySchema.safeParse(input).success,
        false,
      );
    }
  });
});
