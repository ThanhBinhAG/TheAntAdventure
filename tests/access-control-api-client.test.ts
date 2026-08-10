import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  createAccessControlPermission,
  createAccessControlStaffRole,
  createAccessControlUser,
  fetchAccessControlUsersPage,
  updateAccessControlStaffRole,
  updateAccessControlStaffRolePermissions,
  updateRolePermissions,
  updateUserActiveStatus,
  updateUserDisplayName,
  updateUserRole,
} from '../components/access-control/access-control-api';

const originalFetch = globalThis.fetch;
const userId = '216fb577-a0df-4efd-ad97-695b8a69d7f2';

type CapturedRequest = {
  url: string;
  method: string;
  body: unknown;
};

function mockSuccessfulFetch(requests: CapturedRequest[]) {
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });

    if (String(input).startsWith('/api/access-control/users?')) {
      return new Response(JSON.stringify({
        ok: true,
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      }));
    }

    if (String(input) === '/api/access-control/users' && init?.method === 'POST') {
      return new Response(JSON.stringify({ ok: true, userId }));
    }

    return new Response(JSON.stringify({ ok: true }));
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('access-control API client request contracts', () => {
  it('sends a permission catalog item as a JSON POST request', async () => {
    const requests: CapturedRequest[] = [];
    mockSuccessfulFetch(requests);

    await createAccessControlPermission({
      code: 'reports.read',
      description: 'Xem báo cáo',
      groupCode: 'reports',
      groupLabel: 'Báo cáo',
      groupSortOrder: 150,
    });

    assert.deepEqual(requests, [{
      url: '/api/access-control',
      method: 'POST',
      body: {
        code: 'reports.read',
        description: 'Xem báo cáo',
        groupCode: 'reports',
        groupLabel: 'Báo cáo',
        groupSortOrder: 150,
      },
    }]);
  });

  it('keeps staff role actions explicit when sending updates', async () => {
    const requests: CapturedRequest[] = [];
    mockSuccessfulFetch(requests);

    await createAccessControlStaffRole({
      code: 'sales',
      label: 'Bán hàng',
    });
    await updateAccessControlStaffRole({
      code: 'sales',
      label: 'Kinh doanh',
      sortOrder: 40,
      isActive: true,
    });
    await updateAccessControlStaffRolePermissions(
      'sales',
      ['sales.read', 'sales.write'],
    );

    assert.deepEqual(requests.map((request) => request.body), [
      { code: 'sales', label: 'Bán hàng' },
      {
        action: 'update_role',
        code: 'sales',
        label: 'Kinh doanh',
        sortOrder: 40,
        isActive: true,
      },
      {
        action: 'replace_role_permissions',
        roleCode: 'sales',
        permissionCodes: ['sales.read', 'sales.write'],
      },
    ]);
    assert.deepEqual(requests.map((request) => request.method), [
      'POST',
      'PATCH',
      'PATCH',
    ]);
  });

  it('serializes role and user actions without exposing client-only state', async () => {
    const requests: CapturedRequest[] = [];
    mockSuccessfulFetch(requests);

    await updateUserRole(userId, 'sales');
    await updateRolePermissions('employee', ['dashboard.read']);
    await updateUserDisplayName(userId, 'Ngôn');
    await updateUserActiveStatus(userId, false);
    const createdUserId = await createAccessControlUser({
      email: 'new.user@example.com',
      password: 'password-strong',
      displayName: 'New User',
      roleCode: 'sales',
    });

    assert.equal(createdUserId, userId);
    assert.deepEqual(requests.map((request) => request.body), [
      { action: 'set_user_role', userId, roleCode: 'sales' },
      {
        action: 'replace_role_permissions',
        roleCode: 'employee',
        permissionCodes: ['dashboard.read'],
      },
      { action: 'update_profile', userId, displayName: 'Ngôn' },
      { action: 'set_active', userId, isActive: false },
      {
        email: 'new.user@example.com',
        password: 'password-strong',
        displayName: 'New User',
        roleCode: 'sales',
      },
    ]);
  });

  it('only serializes active user-list filters and preserves server errors', async () => {
    const requests: CapturedRequest[] = [];
    mockSuccessfulFetch(requests);

    await fetchAccessControlUsersPage({
      keyword: '  Ngôn  ',
      role: 'sales',
      status: 'active',
      page: 2,
      pageSize: 25,
    });

    const url = new URL(requests[0].url, 'http://localhost');
    assert.equal(url.pathname, '/api/access-control/users');
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      page: '2',
      pageSize: '25',
      q: 'Ngôn',
      role: 'sales',
      status: 'active',
    });

    globalThis.fetch = async () => new Response(JSON.stringify({
      ok: false,
      error: 'Không được phép quản lý người dùng.',
    }), { status: 403 });

    await assert.rejects(
      fetchAccessControlUsersPage({
        keyword: '',
        role: 'all',
        status: 'all',
        page: 1,
        pageSize: 10,
      }),
      /Không được phép quản lý người dùng/,
    );
  });
});
