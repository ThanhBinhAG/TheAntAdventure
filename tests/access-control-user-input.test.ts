import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accessControlUsersQuerySchema,
  accessControlUserUpdateBodySchema,
  createAccessControlUserBodySchema,
  optionalAccessControlQueryParam,
} from '../lib/access-control/user-input';

const userId = '88d25e04-707c-4bc8-bcc2-1537e119ce11';

describe('access-control user request input', () => {
  it('normalizes valid server-side user filters and pagination', () => {
    const result = accessControlUsersQuerySchema.safeParse({
      q: '  Ngôn  ',
      role: 'sales',
      status: 'active',
      page: '2',
      pageSize: '50',
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        q: 'Ngôn',
        role: 'sales',
        status: 'active',
        page: 2,
        pageSize: 50,
      });
    }
  });

  it('uses defaults for missing pagination and rejects unsafe filters', () => {
    assert.deepEqual(accessControlUsersQuerySchema.parse({}), {
      page: 1,
      pageSize: 10,
    });

    for (const input of [
      { page: '0' },
      { pageSize: '101' },
      { role: 'sales-team' },
      { status: 'deleted' },
    ]) {
      assert.equal(accessControlUsersQuerySchema.safeParse(input).success, false);
    }
  });

  it('only accepts the supported PATCH actions with validated fields', () => {
    for (const input of [
      { action: 'update_profile', userId, displayName: 'Ngôn' },
      { action: 'set_active', userId, isActive: false },
      { action: 'restore', userId },
    ]) {
      assert.equal(accessControlUserUpdateBodySchema.safeParse(input).success, true);
    }

    assert.equal(
      accessControlUserUpdateBodySchema.safeParse({
        action: 'set_active',
        userId,
        isActive: 'false',
      }).success,
      false,
    );
  });

  it('rejects an invalid new account before Auth user creation begins', () => {
    const valid = {
      email: 'new.user@example.com',
      password: 'password-strong',
      displayName: 'New User',
      roleCode: 'sales',
    };

    assert.equal(createAccessControlUserBodySchema.safeParse(valid).success, true);
    for (const input of [
      { ...valid, email: 'not-an-email' },
      { ...valid, password: 'short' },
      { ...valid, displayName: ' ' },
      { ...valid, roleCode: 'sales-team' },
    ]) {
      assert.equal(createAccessControlUserBodySchema.safeParse(input).success, false);
    }
  });

  it('turns an empty query parameter into undefined for schema defaults', () => {
    const url = new URL('http://localhost/api/access-control/users?page=');
    assert.equal(optionalAccessControlQueryParam(url, 'page'), undefined);
  });
});
