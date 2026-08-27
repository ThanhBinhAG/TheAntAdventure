import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const authActiveCalls: boolean[] = [];

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: { getAuthContext: async () => ({}) },
});
mock.module(require.resolve('../lib/auth/access-control-admin'), {
  namedExports: {
    setAccessControlAuthUserActive: async (_userId: string, isActive: boolean) => {
      authActiveCalls.push(isActive);
    },
  },
});
mock.module(require.resolve('../lib/auth/security-audit'), {
  namedExports: { recordAuthSecurityEvent: async () => {} },
});
mock.module(require.resolve('../lib/redis/authz-state'), {
  namedExports: { invalidateCachedAuthzState: async () => {} },
});
mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({
      rpc: async () => ({ error: { code: 'P0001', message: 'profile update failed' } }),
    }),
  },
});
mock.module(require.resolve('../lib/redis/permissions'), {
  namedExports: { invalidatePermissionCache: async () => {} },
});
mock.module(require.resolve('../lib/redis/access-control-staff-roles'), {
  namedExports: {
    getCachedAccessControlStaffRoles: async () => null,
    invalidateAccessControlStaffRolesCache: async () => {},
    setCachedAccessControlStaffRoles: async () => {},
  },
});

test('a failed CRM profile RPC does not re-enable an already disabled Auth account', async () => {
  const { AccessControlRpcError, setAccessControlUserActive } = await import('../lib/access-control/server');
  authActiveCalls.length = 0;

  await assert.rejects(
    () => setAccessControlUserActive('user-1', false),
    AccessControlRpcError,
  );
  assert.deepEqual(authActiveCalls, [false]);
});
