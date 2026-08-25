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

let refreshState: 'active' | 'tokensOnlyUserTrap' | 'missing' | 'unavailable' | 'rejected' =
  'active';
let accessCookieIssued = false;
let accessCookieCleared = false;

function tokensOnlySession() {
  const session = {
    access_token: 'renewed-access-token',
    refresh_token: 'renewed-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 600,
    expires_in: 600,
  };
  Object.defineProperty(session, 'user', {
    enumerable: true,
    get() {
      throw new Error(
        '@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "id" property of the session object is not supported. Please use getUser() instead.',
      );
    },
  });
  Object.defineProperty(session, 'id', {
    enumerable: true,
    get() {
      throw new Error(
        '@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "id" property of the session object is not supported. Please use getUser() instead.',
      );
    },
  });
  return session;
}

mock.module(require.resolve('../lib/auth/supabase-ssr'), {
  namedExports: {
    createSupabaseRouteClient: () => ({
      auth: {
        getSession: async () => {
          if (refreshState === 'unavailable') throw new Error('Supabase network unavailable');
          if (refreshState === 'missing') return { data: { session: null }, error: null };
          if (refreshState === 'rejected') {
            return {
              data: { session: null },
              error: Object.assign(new Error('Invalid refresh token'), { status: 401 }),
            };
          }
          if (refreshState === 'tokensOnlyUserTrap') {
            return { data: { session: tokensOnlySession() }, error: null };
          }
          return {
            data: {
              session: {
                access_token: 'renewed-access-token',
                refresh_token: 'renewed-refresh-token',
                expires_at: Math.floor(Date.now() / 1000) + 600,
                expires_in: 600,
              },
            },
            error: null,
          };
        },
      },
    }),
    setSupabaseAccessCookie: () => {
      accessCookieIssued = true;
    },
    clearSupabaseAccessCookie: () => {
      accessCookieCleared = true;
    },
    clearLegacyCrmAuthCookies: () => {},
  },
});
mock.module(require.resolve('../lib/auth/rate-limit'), {
  namedExports: {
    getClientIp: () => '127.0.0.1',
    consumeRefreshRateLimit: async () => ({ ok: true }),
  },
});
mock.module(require.resolve('../lib/auth/request-origin'), {
  namedExports: { hasTrustedRequestOrigin: () => true },
});
mock.module(require.resolve('../lib/auth/cookie-hygiene'), {
  namedExports: { clearSupabaseAuthCookies: () => {} },
});

test('Supabase refresh preserves the HttpOnly session without returning a token in JSON', async (t) => {
  const route = await import('../app/api/auth/refresh/route');

  await t.beforeEach(() => {
    refreshState = 'active';
    accessCookieIssued = false;
    accessCookieCleared = false;
  });

  await t.test('updates the access mirror and returns no credential body', async () => {
    const response = await route.POST(
      new Request('https://crm.example.test/api/auth/refresh', {
        method: 'POST',
        headers: { Origin: 'https://crm.example.test' },
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(accessCookieIssued, true);
  });

  await t.test('succeeds when session.user/id getters throw (tokens-only SSR)', async () => {
    refreshState = 'tokensOnlyUserTrap';
    const response = await route.POST(
      new Request('https://crm.example.test/api/auth/refresh', {
        method: 'POST',
        headers: { Origin: 'https://crm.example.test' },
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(accessCookieIssued, true);
  });

  await t.test('returns 401 and clears access credentials when the session is missing', async () => {
    refreshState = 'missing';
    const response = await route.POST(
      new Request('https://crm.example.test/api/auth/refresh', {
        method: 'POST',
        headers: { Origin: 'https://crm.example.test' },
      }),
    );

    assert.equal(response.status, 401);
    assert.equal(accessCookieCleared, true);
  });

  await t.test(
    'returns 401 and clears access credentials when Supabase rejects the refresh token',
    async () => {
      refreshState = 'rejected';
      const response = await route.POST(
        new Request('https://crm.example.test/api/auth/refresh', {
          method: 'POST',
          headers: { Origin: 'https://crm.example.test' },
        }),
      );

      assert.equal(response.status, 401);
      assert.equal(accessCookieCleared, true);
    },
  );

  await t.test(
    'returns 503 without clearing credentials when Supabase is temporarily unavailable',
    async () => {
      refreshState = 'unavailable';
      const response = await route.POST(
        new Request('https://crm.example.test/api/auth/refresh', {
          method: 'POST',
          headers: { Origin: 'https://crm.example.test' },
        }),
      );

      assert.equal(response.status, 503);
      assert.equal(accessCookieCleared, false);
    },
  );
});
