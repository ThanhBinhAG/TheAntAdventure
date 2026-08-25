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
let refreshFailureLogged = false;
let refreshAuditUserId: string | null | undefined;

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
            return { data: { session: null }, error: Object.assign(new Error('Invalid refresh token'), { status: 401 }) };
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
                user: new Proxy(
                  {},
                  {
                    get: () => {
                      throw new Error('tokens-only session user is unavailable');
                    },
                  },
                ),
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
  namedExports: { getClientIp: () => '127.0.0.1', consumeRefreshRateLimit: async () => ({ ok: true }) },
});
mock.module(require.resolve('../lib/auth/request-origin'), {
  namedExports: { hasTrustedRequestOrigin: () => true },
});
mock.module(require.resolve('../lib/auth/cookie-hygiene'), {
  namedExports: { clearSupabaseAuthCookies: () => {} },
});
mock.module(require.resolve('../lib/auth/security-audit'), {
  namedExports: {
    recordAuthSecurityEvent: async (input: { userId?: string | null }) => {
      refreshAuditUserId = input.userId;
    },
  },
});
mock.module(require.resolve('../lib/system/server-logger'), {
  namedExports: {
    serverLogger: { warn: () => {} },
    requestLogger: () => ({
      logger: { warn: () => { refreshFailureLogged = true; } },
      requestId: 'refresh-test-request-id',
    }),
  },
});

test('Supabase refresh preserves the HttpOnly session without returning a token in JSON', async (t) => {
  const { POST } = await import('../app/api/auth/refresh/route');
  const request = () => new Request('https://crm.example.test/api/auth/refresh', {
    method: 'POST', headers: { Origin: 'https://crm.example.test' },
  });

  await t.beforeEach(() => {
    refreshState = 'active';
    accessCookieIssued = false;
    accessCookieCleared = false;
    refreshFailureLogged = false;
    refreshAuditUserId = undefined;
  });

  await t.test('updates the access mirror and returns no credential body', async () => {
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(accessCookieIssued, true);
    assert.equal(refreshAuditUserId, undefined);
  });

  await t.test('succeeds when tokens-only session.user throws on access', async () => {
    refreshState = 'tokensOnlyUserTrap';
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(accessCookieIssued, true);
  });

  await t.test('returns 401 and clears credentials for missing or rejected sessions', async () => {
    refreshState = 'missing';
    assert.equal((await POST(request())).status, 401);
    assert.equal(accessCookieCleared, true);
    refreshState = 'rejected';
    assert.equal((await POST(request())).status, 401);
  });

  await t.test('returns 503 without clearing credentials for temporary failures', async () => {
    refreshState = 'unavailable';
    const response = await POST(request());
    assert.equal(response.status, 503);
    assert.equal(accessCookieCleared, false);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.equal(response.headers.get('x-request-id'), 'refresh-test-request-id');
    assert.equal(refreshFailureLogged, true);
  });
});
