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

let durableSessionReads = 0;

mock.module(require.resolve('next/headers'), {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => (
        name === 'crm_access'
          ? { value: 'crm-access-jwt' }
          : name === 'crm_supabase_access'
            ? { value: 'supabase-access-jwt' }
            : undefined
      ),
    }),
  },
});

mock.module(require.resolve('../lib/auth/crm-session'), {
  namedExports: {
    CRM_ACCESS_COOKIE: 'crm_access',
    CRM_SESSION_COOKIE: 'crm_session',
    CRM_SUPABASE_ACCESS_COOKIE: 'crm_supabase_access',
    getCrmSession: async () => {
      durableSessionReads++;
      return null;
    },
    getCrmSessionRevocationStatus: async () => 'active',
  },
});

mock.module(require.resolve('../lib/auth/crm-access-token'), {
  namedExports: {
    verifyCrmAccessToken: async () => ({
      sid: 'session-1',
      userId: 'user-1',
      email: 'user@example.com',
      isBreakGlass: false,
    }),
  },
});

mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: { ensureBreakGlassShadowPrivilegesOnce: async () => {} },
});

test('a valid CRM access JWT avoids a durable CRM session read', async () => {
  const { getAuthContext } = await import('../lib/auth/session');

  const auth = await getAuthContext();

  assert.deepEqual(auth, {
    authenticated: true,
    isSuperAdmin: false,
    isBreakGlass: false,
    userId: 'user-1',
    email: 'user@example.com',
  });
  assert.equal(durableSessionReads, 0);
});
