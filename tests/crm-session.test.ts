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

type DurableRecord = {
  sid: string;
  payloadCiphertext: string;
  expiresAt: string;
  revokedAt: string | null;
};

const durableRecords = new Map<string, DurableRecord>();
const redisRecords = new Map<string, string>();
let redisAvailable = true;

mock.module(require.resolve('../lib/redis/client'), {
  namedExports: {
    getRedisClient: async () => redisAvailable ? ({
      get: async (key: string) => redisRecords.get(key) ?? null,
      set: async (key: string, value: string) => {
        redisRecords.set(key, value);
      },
      del: async (key: string) => {
        redisRecords.delete(key);
      },
    }) : null,
  },
});

mock.module(require.resolve('../lib/auth/crm-session-store'), {
  namedExports: {
    createDurableCrmSession: async (record: DurableRecord) => {
      durableRecords.set(record.sid, record);
    },
    findDurableCrmSession: async (sid: string) => durableRecords.get(sid) ?? null,
    updateDurableCrmSession: async (record: DurableRecord) => {
      const existing = durableRecords.get(record.sid);
      if (existing && !existing.revokedAt) durableRecords.set(record.sid, record);
    },
    revokeDurableCrmSession: async (sid: string) => {
      const existing = durableRecords.get(sid);
      if (existing && !existing.revokedAt) {
        durableRecords.set(sid, { ...existing, revokedAt: new Date().toISOString() });
      }
    },
  },
});

process.env.CRM_SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-hmac';

test('CRM session store', async (t) => {
  const sessions = await import('../lib/auth/crm-session');

  await t.beforeEach(() => {
    durableRecords.clear();
    redisRecords.clear();
    redisAvailable = true;
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
    assert.equal(durableRecords.size, 1);
    assert.ok(!durableRecords.get(session.sid)?.payloadCiphertext.includes('access-token'));
    assert.equal(redisRecords.size, 0);

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

  await t.test('keeps an existing session valid when Redis is unavailable', async () => {
    const { cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    redisAvailable = false;
    assert.equal((await sessions.getCrmSession(cookieValue))?.userId, 'user-1');
  });

  await t.test('creates a new durable session when Redis is unavailable', async () => {
    redisAvailable = false;
    const { session, cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    assert.equal(durableRecords.has(session.sid), true);
    assert.equal((await sessions.getCrmSession(cookieValue))?.userId, 'user-1');
  });

  await t.test('revokes the durable session when Redis is unavailable', async () => {
    const { cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    redisAvailable = false;
    await sessions.revokeCrmSession(cookieValue);
    assert.equal(await sessions.getCrmSession(cookieValue), null);
  });

  await t.test('removes an expired session', async () => {
    const { session, cookieValue } = await sessions.createCrmSession({
      userId: 'user-1',
      email: null,
      isBreakGlass: false,
      supabaseAccessToken: 'access-token',
      supabaseRefreshToken: 'refresh-token',
      supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    await sessions.updateCrmSession({
      ...session,
      expiresAt: Math.floor(Date.now() / 1000) - 1,
    });
    assert.equal(await sessions.getCrmSession(cookieValue), null);
  });
});
