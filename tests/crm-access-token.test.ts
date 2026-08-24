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

process.env.CRM_ACCESS_TOKEN_SECRET = 'crm-access-token-secret-that-is-long-enough-for-hs256';

test('CRM access JWT is short-lived, bound to the server-only Supabase access token, and tamper-resistant', async () => {
  const {
    issueCrmAccessToken,
    verifyCrmAccessToken,
  } = await import('../lib/auth/crm-access-token');

  const issued = await issueCrmAccessToken({
    sid: 'session-1',
    userId: 'user-1',
    email: 'user@example.com',
    isBreakGlass: false,
    supabaseAccessToken: 'supabase-access-token',
    supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
  });

  assert.ok(issued);
  assert.equal(issued.token.split('.').length, 3);
  assert.ok(!issued.token.includes('supabase-access-token'));
  assert.ok(issued.maxAge > 0 && issued.maxAge <= 10 * 60);

  assert.deepEqual(
    await verifyCrmAccessToken(issued.token, 'supabase-access-token'),
    {
      sid: 'session-1',
      userId: 'user-1',
      email: 'user@example.com',
      isBreakGlass: false,
    },
  );
  assert.equal(await verifyCrmAccessToken(issued.token, 'different-supabase-token'), null);
  assert.equal(await verifyCrmAccessToken(`${issued.token}x`, 'supabase-access-token'), null);
});
