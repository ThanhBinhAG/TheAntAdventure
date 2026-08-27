import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const key = Buffer.alloc(32, 9).toString('base64url');

test('durable CRM session repository stores only a hash and encrypted Supabase credentials', async () => {
  const { createCrmSessionRepository } = await import('../lib/auth/crm-session-repository');
  let inserted: Record<string, unknown> | undefined;
  const client = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted = row;
        return { select: () => ({ single: async () => ({ data: { sid: row.sid }, error: null }) }) };
      },
    }),
  };
  const repository = createCrmSessionRepository(client, key);
  const created = await repository.create({
    userId: 'b0fe2f45-d1a6-41ac-a7b5-2c0b6ea9a3bf',
    accessToken: 'access-secret',
    refreshToken: 'refresh-secret',
    accessTokenExpiresAt: new Date('2030-01-01T00:05:00.000Z'),
    expiresAt: new Date('2030-01-31T00:00:00.000Z'),
  });

  assert.match(created.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(typeof inserted?.token_hash, 'string');
  assert.notEqual(inserted?.token_hash, created.token);
  assert.doesNotMatch(JSON.stringify(inserted), /access-secret|refresh-secret/);
  assert.equal(inserted?.user_id, 'b0fe2f45-d1a6-41ac-a7b5-2c0b6ea9a3bf');
});

test('durable CRM session repository decrypts credentials only after an active hash lookup', async () => {
  const { createCrmSessionRepository } = await import('../lib/auth/crm-session-repository');
  const { encryptSessionSecret, hashSessionToken } = await import('../lib/auth/crm-session-crypto');
  const token = 'A'.repeat(43);
  const row = {
    sid: '46b77c2c-e73e-4ce7-b2a6-3d1fa014b9de',
    token_hash: hashSessionToken(token),
    user_id: 'b0fe2f45-d1a6-41ac-a7b5-2c0b6ea9a3bf',
    access_token_ciphertext: encryptSessionSecret('access-secret', key),
    refresh_token_ciphertext: encryptSessionSecret('refresh-secret', key),
    access_token_expires_at: '2030-01-01T00:05:00.000Z',
    expires_at: '2030-01-31T00:00:00.000Z',
  };
  const query = {
    eq: () => query,
    is: () => query,
    gt: () => query,
    maybeSingle: async () => ({ data: row, error: null }),
  };
  let lastUsedUpdateDispatched = false;
  const client = {
    from: () => ({
      select: () => query,
      update: () => ({
        eq: () => ({
          then: (resolve: () => void) => {
            lastUsedUpdateDispatched = true;
            resolve();
          },
        }),
      }),
    }),
  };
  const repository = createCrmSessionRepository(client, key);

  assert.deepEqual(await repository.lookup(token), {
    id: row.sid,
    userId: row.user_id,
    accessToken: 'access-secret',
    refreshToken: 'refresh-secret',
    accessTokenExpiresAt: new Date(row.access_token_expires_at),
    expiresAt: new Date(row.expires_at),
  });
  assert.equal(lastUsedUpdateDispatched, true);
});

test('refresh credential rotation calls the atomic database RPC with no plaintext token', async () => {
  const { createCrmSessionRepository } = await import('../lib/auth/crm-session-repository');
  let rpcName = '';
  let rpcArgs: Record<string, unknown> | undefined;
  const repository = createCrmSessionRepository({
    from: () => { throw new Error('not used'); },
    rpc: async (name, args) => {
      rpcName = name;
      rpcArgs = args;
      return { data: true, error: null };
    },
  }, key);

  await repository.rotateCredentials({
    id: 'session-1',
    token: 'opaque-session-token',
    accessToken: 'next-access-token',
    refreshToken: 'next-refresh-token',
    accessTokenExpiresAt: new Date('2030-01-01T00:05:00.000Z'),
    expiresAt: new Date('2030-01-31T00:00:00.000Z'),
  });

  assert.equal(rpcName, 'rotate_crm_session_credentials');
  assert.notEqual(rpcArgs?.p_token_hash, 'opaque-session-token');
  assert.doesNotMatch(JSON.stringify(rpcArgs), /next-access-token|next-refresh-token/);
});
