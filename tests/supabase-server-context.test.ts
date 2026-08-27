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

let jwtVerifications = 0;
let authzReads = 0;
let issuedToken: string | null = null;

mock.module(require.resolve('next/headers'), {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => name === 'sb-crm-access-token'
        ? { value: 'supabase-access-jwt' }
        : undefined,
    }),
  },
});
mock.module(require.resolve('../lib/auth/supabase-jwt'), {
  namedExports: {
    verifySupabaseAccessTokenResult: async () => {
      jwtVerifications += 1;
      return {
        status: 'verified',
        access: {
          userId: 'user-1',
          email: 'user@example.com',
          sessionId: 'session-1',
        },
      };
    },
    verifySupabaseAccessToken: async () => {
      jwtVerifications += 1;
      return { userId: 'user-1', email: 'user@example.com', sessionId: 'session-1' };
    },
  },
});
mock.module(require.resolve('../lib/auth/authz-state'), {
  namedExports: {
    getCurrentAuthzStateResult: async () => {
      authzReads += 1;
      return { status: 'active', state: { isActive: true, version: 1 } };
    },
    getCurrentAuthzState: async () => {
      authzReads += 1;
      return { isActive: true, version: 1 };
    },
  },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: {
    ensureBreakGlassShadowPrivilegesOnce: async () => {},
    isBreakGlassShadowEmail: () => false,
  },
});
mock.module(require.resolve('../lib/server/env/supabase'), {
  namedExports: {
    getSupabaseUrl: () => 'https://supabase.example.test',
    getSupabaseAnonKey: () => 'anon-key',
    getSupabaseServiceRoleKey: () => 'service-role-key',
  },
});
mock.module(require.resolve('../lib/supabase/insecure-fetch'), {
  namedExports: { getSupabaseGlobalFetchOptions: () => ({}) },
});
mock.module(require.resolve('@supabase/supabase-js'), {
  namedExports: {
    createClient: (_url: string, _key: string, options: { accessToken?: () => Promise<string> }) => {
      void options.accessToken?.().then((token) => { issuedToken = token; });
      return { kind: 'user-scoped-client' };
    },
  },
});

test('a BFF can create its user-scoped client from an already-verified auth context', async () => {
  const { getAuthContext } = await import('../lib/auth/session');
  const { getServerSupabaseClient } = await import('../lib/supabase/server');

  jwtVerifications = 0;
  authzReads = 0;
  issuedToken = null;
  const auth = await getAuthContext();
  const client = await getServerSupabaseClient(auth);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(client, { kind: 'user-scoped-client' });
  assert.equal(jwtVerifications, 1);
  assert.equal(authzReads, 1);
  assert.equal(issuedToken, 'supabase-access-jwt');
});
