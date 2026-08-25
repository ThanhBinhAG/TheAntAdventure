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
      get: (name: string) => (
        name === 'sb-crm-access-token'
          ? { value: 'supabase-access-jwt' }
          : undefined
      ),
    }),
  },
});

let verificationUnavailable = false;
mock.module(require.resolve('../lib/auth/supabase-jwt'), {
  namedExports: {
    verifySupabaseAccessTokenResult: async () => {
      if (verificationUnavailable) return { status: 'unavailable' };
      return {
        status: 'verified',
        access: {
          userId: 'user-1',
          email: 'user@example.com',
          sessionId: 'session-1',
        },
      };
    },
  },
});

let authzActive = true;
mock.module(require.resolve('../lib/auth/authz-state'), {
  namedExports: {
    getCurrentAuthzState: async () => ({ isActive: authzActive, version: 1 }),
  },
});

mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: {
    ensureBreakGlassShadowPrivilegesOnce: async () => {},
    isBreakGlassShadowEmail: () => false,
  },
});

test('a valid Supabase JWT creates auth context without reading a CRM durable session', async () => {
  const { getAuthContext } = await import('../lib/auth/session');

  const auth = await getAuthContext();

  assert.deepEqual(auth, {
    authenticated: true,
    isSuperAdmin: false,
    isBreakGlass: false,
    userId: 'user-1',
    email: 'user@example.com',
  });
});

test('a disabled CRM profile is rejected even while its Supabase access JWT remains valid', async () => {
  const { getAuthContext } = await import('../lib/auth/session');
  authzActive = false;
  try {
    assert.deepEqual(await getAuthContext(), {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
    });
  } finally {
    authzActive = true;
  }
});

test('a temporary JWKS failure is marked as unavailable instead of unauthenticated', async () => {
  const { getAuthContext } = await import('../lib/auth/session');
  verificationUnavailable = true;
  try {
    assert.deepEqual(await getAuthContext(), {
      authenticated: false,
      isSuperAdmin: false,
      isBreakGlass: false,
      userId: null,
      email: null,
      verificationUnavailable: true,
    });
  } finally {
    verificationUnavailable = false;
  }
});
