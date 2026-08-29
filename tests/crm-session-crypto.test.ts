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

test('CRM session tokens are opaque, one-way hashed, and encrypt server credentials', async () => {
  const crypto = await import('../lib/auth/crm-session-crypto');
  const key = Buffer.alloc(32, 7).toString('base64url');

  const token = crypto.createSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, crypto.createSessionToken());
  assert.equal(crypto.hashSessionToken(token), crypto.hashSessionToken(token));
  assert.notEqual(crypto.hashSessionToken(token), token);

  const ciphertext = crypto.encryptSessionSecret('supabase-refresh-token', key);
  assert.doesNotMatch(ciphertext, /supabase-refresh-token/);
  assert.equal(crypto.decryptSessionSecret(ciphertext, key), 'supabase-refresh-token');
  assert.throws(() => crypto.decryptSessionSecret(ciphertext, Buffer.alloc(32, 8).toString('base64url')));
});

test('CRM session credential encryption rejects missing or incorrectly-sized runtime keys', async () => {
  const { assertValidSessionEncryptionKey } = await import('../lib/auth/crm-session-crypto');

  assert.throws(() => assertValidSessionEncryptionKey(''), /SESSION_ENCRYPTION_KEY/);
  assert.throws(() => assertValidSessionEncryptionKey(Buffer.alloc(31).toString('base64url')), /32-byte/);
});
