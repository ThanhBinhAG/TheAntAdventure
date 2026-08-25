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
  expiresAt?: number | null;
  issuer?: string;
  subject?: string | null;
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
    .setIssuer(input.issuer ?? issuer)
    .setAudience(input.audience ?? 'authenticated')
    .setIssuedAt();
  if (input.expiresAt !== null) token.setExpirationTime(input.expiresAt ?? '5m');
  if (input.subject !== null) token.setSubject(input.subject ?? 'user-1');

  return { token: await token.sign(privateKey), jwks };
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

test('rejects a Supabase token with invalid required claims', async () => {
  const wrongAudience = await signedToken({ audience: 'other-app' });
  const expired = await signedToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 });
  const wrongIssuer = await signedToken({ issuer: 'https://attacker.example.test/auth/v1' });
  const missingSubject = await signedToken({ subject: null });
  const missingExpiry = await signedToken({ expiresAt: null });

  assert.equal(await verify(wrongAudience.token, {
    issuer,
    jwks: wrongAudience.jwks,
  }), null);
  assert.equal(await verify(expired.token, {
    issuer,
    jwks: expired.jwks,
  }), null);
  assert.equal(await verify(wrongIssuer.token, {
    issuer,
    jwks: wrongIssuer.jwks,
  }), null);
  assert.equal(await verify(missingSubject.token, {
    issuer,
    jwks: missingSubject.jwks,
  }), null);
  assert.equal(await verify(missingExpiry.token, {
    issuer,
    jwks: missingExpiry.jwks,
  }), null);
});

test('uses the configured public issuer when the server reaches Supabase privately', async () => {
  const previousIssuer = process.env.SUPABASE_JWT_ISSUER;
  const previousPublic = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_JWT_ISSUER = issuer;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.example.test:9001';
  try {
    const {
      getSupabaseAuthIssuer,
      getSupabaseAuthIssuers,
      getSupabaseJwksUrl,
    } = await import('../lib/auth/supabase-jwt');
    assert.equal(getSupabaseAuthIssuer('http://supabase-gateway:8000'), issuer);
    assert.deepEqual(getSupabaseAuthIssuers('http://supabase-gateway:8000'), [
      issuer,
      'https://sb.example.test:9001/auth/v1',
    ]);
    assert.equal(
      getSupabaseJwksUrl()?.href,
      'https://sb.example.test:9001/auth/v1/.well-known/jwks.json',
    );
  } finally {
    if (previousIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER;
    else process.env.SUPABASE_JWT_ISSUER = previousIssuer;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublic;
  }
});

test('fetches JWKS from the public Supabase URL even when issuer is a private LAN host', async () => {
  const previousIssuer = process.env.SUPABASE_JWT_ISSUER;
  const previousPublic = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_JWT_ISSUER = 'http://192.168.1.75:9001/auth/v1';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.example.test:9001';
  try {
    const { getSupabaseJwksUrl, getSupabaseAuthIssuers } = await import(
      '../lib/auth/supabase-jwt'
    );
    assert.equal(
      getSupabaseJwksUrl()?.href,
      'https://sb.example.test:9001/auth/v1/.well-known/jwks.json',
    );
    assert.ok(
      getSupabaseAuthIssuers().includes('http://192.168.1.75:9001/auth/v1'),
    );
    assert.ok(
      getSupabaseAuthIssuers().includes('https://sb.example.test:9001/auth/v1'),
    );
  } finally {
    if (previousIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER;
    else process.env.SUPABASE_JWT_ISSUER = previousIssuer;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousPublic;
  }
});
