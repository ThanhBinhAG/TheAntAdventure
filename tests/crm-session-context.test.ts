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

mock.module(require.resolve('next/headers'), {
  namedExports: {
    cookies: async () => ({
      get: (name: string) => name === 'crm_session' ? { value: 'opaque-crm-session-token' } : undefined,
    }),
  },
});
mock.module(require.resolve('../lib/auth/crm-session-repository'), {
  namedExports: {
    getCrmSessionRepository: () => ({
      lookup: async () => ({
        id: 'session-1',
        userId: 'user-1',
        accessToken: 'server-only-access-token',
        refreshToken: 'server-only-refresh-token',
        accessTokenExpiresAt: new Date('2030-01-01T00:05:00.000Z'),
        expiresAt: new Date('2030-01-31T00:00:00.000Z'),
      }),
    }),
  },
});
mock.module(require.resolve('../lib/auth/supabase-jwt'), {
  namedExports: {
    verifySupabaseAccessTokenResult: async () => ({
      status: 'verified',
      access: { userId: 'user-1', email: 'user@example.com', sessionId: 'supabase-session-1' },
    }),
  },
});
mock.module(require.resolve('../lib/auth/authz-state'), {
  namedExports: {
    getCurrentAuthzStateResult: async () => ({
      status: 'active',
      state: { isActive: true, version: 1 },
    }),
  },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: {
    ensureBreakGlassShadowPrivilegesOnce: async () => {},
    isBreakGlassShadowEmail: () => false,
  },
});

test('auth context authenticates only a durable CRM session and keeps Supabase credentials server-only', async () => {
  const { getAuthContext, getVerifiedSupabaseAccessToken } = await import('../lib/auth/session');

  const context = await getAuthContext();
  assert.deepEqual(context, {
    authenticated: true,
    isSuperAdmin: false,
    isBreakGlass: false,
    userId: 'user-1',
    email: 'user@example.com',
  });
  assert.equal(getVerifiedSupabaseAccessToken(context), 'server-only-access-token');
  assert.doesNotMatch(JSON.stringify(context), /access-token|refresh-token/);
});
