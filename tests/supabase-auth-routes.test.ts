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

let accessCookieIssued = false;
let legacyCookiesCleared = false;

mock.module(require.resolve('../lib/auth/supabase-ssr'), {
  namedExports: {
    createSupabaseRouteClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          data: {
            user: { id: 'user-1', email: 'user@example.com' },
            session: {
              access_token: 'supabase-access-token',
              refresh_token: 'supabase-refresh-token',
              expires_at: Math.floor(Date.now() / 1000) + 600,
              expires_in: 600,
            },
          },
          error: null,
        }),
      },
    }),
    setSupabaseAccessCookie: () => { accessCookieIssued = true; },
    clearLegacyCrmAuthCookies: () => { legacyCookiesCleared = true; },
  },
});
mock.module(require.resolve('../lib/auth/break-glass'), {
  namedExports: {
    checkBreakGlassCredentials: () => ({
      configured: false,
      usernameMatches: false,
      passwordMatches: false,
    }),
  },
});
mock.module(require.resolve('../lib/auth/rate-limit'), {
  namedExports: {
    getClientIp: () => '127.0.0.1',
    checkLoginRateLimit: async () => ({ ok: true }),
    clearLoginFailures: async () => {},
    recordLoginFailure: async () => {},
  },
});
mock.module(require.resolve('../lib/auth/login-history'), {
  namedExports: { getLoginClientMetadata: () => ({}) },
});
mock.module(require.resolve('../lib/auth/login-history-store'), {
  namedExports: { recordSuccessfulLogin: async () => {} },
});
mock.module(require.resolve('../lib/system/debug-logger'), {
  namedExports: { debugLog: () => {} },
});

test('login persists only Supabase Auth cookies and clears the retired CRM cookie bridge', async () => {
  const { POST } = await import('../app/api/auth/login/route');
  accessCookieIssued = false;
  legacyCookiesCleared = false;

  const response = await POST(new Request('https://crm.example.test/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'user@example.com', password: 'correct-password' }),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, mode: 'crm' });
  assert.equal(accessCookieIssued, true);
  assert.equal(legacyCookiesCleared, true);
});
