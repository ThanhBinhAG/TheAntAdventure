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

let refreshable = true;
let accessCookieIssued = false;

mock.module(require.resolve('../lib/auth/crm-session'), {
  namedExports: {
    CRM_SESSION_COOKIE: 'crm_session',
    getCrmSession: async () => refreshable ? { sid: 'session-1' } : null,
    refreshCrmSessionIfNeeded: async (session: { sid: string }) => refreshable ? session : null,
    setCrmAccessCookies: async () => { accessCookieIssued = true; },
    clearCrmAccessCookies: () => {},
  },
});

test('CRM refresh exchanges only a durable session cookie for renewed HttpOnly access credentials', async (t) => {
  const route = await import('../app/api/auth/refresh/route');

  await t.beforeEach(() => {
    refreshable = true;
    accessCookieIssued = false;
  });

  await t.test('renews access credentials without returning a token in JSON', async () => {
    const response = await route.POST(new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: { Cookie: 'crm_session=signed-session' },
    }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(accessCookieIssued, true);
  });

  await t.test('returns 401 when the durable refresh session is absent or revoked', async () => {
    refreshable = false;
    const response = await route.POST(new Request('http://localhost/api/auth/refresh', {
      method: 'POST',
    }));

    assert.equal(response.status, 401);
    assert.equal(accessCookieIssued, false);
  });
});
