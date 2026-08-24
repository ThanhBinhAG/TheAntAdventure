import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

async function verify(...args: Parameters<typeof import('../lib/auth/supabase-jwt').verifySupabaseAccessToken>) {
  const { verifySupabaseAccessToken } = await import('../lib/auth/supabase-jwt');
  return verifySupabaseAccessToken(...args);
}

const issuer = 'https://supabase.example.test/auth/v1';

async function signedToken(input: {
  audience?: string;
  expiresAt?: number;
}) {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const publicJwk = await exportJWK(publicKey);
  const jwks = createLocalJWKSet({
    keys: [{ ...publicJwk, kid: 'test-key', alg: 'ES256', use: 'sig' }],
  });
  const token = await new SignJWT({
    email: 'user@example.com',
    role: 'authenticated',
    session_id: 'session-1',
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setSubject('user-1')
    .setIssuer(issuer)
    .setAudience(input.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(input.expiresAt ?? '5m')
    .sign(privateKey);

  return { token, jwks };
}

test('verifies a Supabase ES256 access token against its JWKS and required claims', async () => {
  const { token, jwks } = await signedToken({});

  const verified = await verify(token, {
    issuer,
    jwks,
  });

  assert.deepEqual(verified, {
    userId: 'user-1',
    email: 'user@example.com',
    sessionId: 'session-1',
  });
});

test('rejects a Supabase token with a wrong audience or an expired lifetime', async () => {
  const wrongAudience = await signedToken({ audience: 'other-app' });
  const expired = await signedToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 });

  assert.equal(await verify(wrongAudience.token, {
    issuer,
    jwks: wrongAudience.jwks,
  }), null);
  assert.equal(await verify(expired.token, {
    issuer,
    jwks: expired.jwks,
  }), null);
});
