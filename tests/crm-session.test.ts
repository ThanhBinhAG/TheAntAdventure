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

const records = new Map<string, string>();
mock.module(require.resolve('../lib/redis/client'), {
  namedExports: {
    getRedisClient: async () => ({
      get: async (key: string) => records.get(key) ?? null,
      set: async (key: string, value: string) => {
        records.set(key, value);
      },
      del: async (key: string) => {
        records.delete(key);
      },
    }),
  },
});

process.env.CRM_SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-hmac';

test('CRM session store', async (t) => {
  const sessions = await import('../lib/auth/crm-session');

  await t.beforeEach(() => {
    records.clear();
  });

  await t.test('creates a server-side session and accepts its signed cookie', async () => {
    const { session, cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: 'user@example.com',
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    assert.ok(cookieValue.startsWith(`${session.sid}.`));
    assert.ok(!cookieValue.includes('access-token'));
    assert.equal(records.size, 1);

    const restored = await sessions.getCrmSession(cookieValue);
    assert.equal(restored?.userId, 'user-1');
    assert.equal(restored?.supabaseRefreshToken, 'refresh-token');
  });

  await t.test('rejects a modified cookie signature', async () => {
    const { cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    assert.equal(await sessions.getCrmSession(`${cookieValue}x`), null);
  });

  await t.test('revokes the Redis session immediately', async () => {
    const { cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    await sessions.revokeCrmSession(cookieValue);
    assert.equal(await sessions.getCrmSession(cookieValue), null);
  });
});
