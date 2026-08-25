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

test('auth mutations accept only the request or configured application origin', async () => {
  const { hasTrustedRequestOrigin } = await import('../lib/auth/request-origin');
  const previous = process.env.APP_URL;
  process.env.APP_URL = 'https://crm.example.test';
  try {
    assert.equal(hasTrustedRequestOrigin(new Request('https://crm.example.test/api/auth/login', {
      headers: { Origin: 'https://crm.example.test' },
    })), true);
    assert.equal(hasTrustedRequestOrigin(new Request('https://internal.example.test/api/auth/login', {
      headers: { Origin: 'https://crm.example.test' },
    })), true);
    assert.equal(hasTrustedRequestOrigin(new Request('https://crm.example.test/api/auth/login', {
      headers: { Origin: 'https://attacker.example.test' },
    })), false);
    assert.equal(hasTrustedRequestOrigin(new Request('https://crm.example.test/api/auth/login')), false);
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
