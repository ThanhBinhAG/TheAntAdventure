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

let authReads = 0;
let supabaseCreates = 0;
let permissionContext: unknown;

mock.module(require.resolve('../lib/auth/session'), {
  namedExports: {
    getAuthContext: async () => {
      authReads++;
      return {
        authenticated: true,
        isSuperAdmin: false,
        isBreakGlass: false,
        userId: 'user-1',
        email: 'user@example.com',
      };
    },
  },
});

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async (_permission: string, context: unknown) => {
      permissionContext = context;
      return { allowed: true };
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => {
      supabaseCreates++;
      return { kind: 'user-scoped-client' };
    },
  },
});

test('bffRoute creates one reusable auth context and lazy user-scoped client', async () => {
  const { bffRoute } = await import('../lib/bff/route');
  const handler = bffRoute(
    { requiredPermission: 'tour_design.read' },
    async ({ auth, supabase }) => ({ auth, supabase }),
  );

  const response = await handler(new Request('http://localhost/api/test'));

  assert.equal(response.status, 200);
  assert.equal(authReads, 1);
  assert.equal(supabaseCreates, 1);
  assert.deepEqual((permissionContext as { auth?: unknown }).auth, {
    authenticated: true,
    isSuperAdmin: false,
    isBreakGlass: false,
    userId: 'user-1',
    email: 'user@example.com',
  });
  assert.equal(typeof (permissionContext as { getSupabaseClient?: unknown }).getSupabaseClient, 'function');
});
