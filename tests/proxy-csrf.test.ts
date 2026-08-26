import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import { NextRequest, NextResponse } from 'next/server';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let delegated = 0;
mock.module(require.resolve('../lib/supabase/middleware'), {
  namedExports: {
    updateSession: async () => {
      delegated++;
      return NextResponse.json({ ok: true });
    },
  },
});

test('proxy blocks cross-origin cookie-authenticated API mutations', async (t) => {
  const { proxy } = await import('../proxy');
  await t.beforeEach(() => { delegated = 0; });

  await t.test('rejects a mutation with an untrusted origin', async () => {
    const response = await proxy(new NextRequest('https://crm.example.test/api/products', {
      method: 'POST',
      headers: { Cookie: 'sb-crm-access-token=token', Origin: 'https://attacker.example.test' },
    }));
    assert.equal(response.status, 403);
    assert.equal(delegated, 0);
  });

  await t.test('allows a same-origin authenticated mutation and token-authenticated automation', async () => {
    const sameOrigin = await proxy(new NextRequest('https://crm.example.test/api/products', {
      method: 'POST',
      headers: { Cookie: 'sb-crm-access-token=token', Origin: 'https://crm.example.test' },
    }));
    assert.equal(sameOrigin.status, 200);

    const automation = await proxy(new NextRequest('https://crm.example.test/api/weather/refresh', {
      method: 'POST',
      headers: { Authorization: 'Bearer cron-secret' },
    }));
    assert.equal(automation.status, 200);
    assert.equal(delegated, 2);
  });
});
