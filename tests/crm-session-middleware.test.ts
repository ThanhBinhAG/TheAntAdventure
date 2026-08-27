import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { NextRequest } from 'next/server';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

test('Proxy validates only CRM opaque sessions and clears retired Supabase cookies', async (t) => {
  const { updateSession } = await import('../lib/supabase/middleware');
  const originalFetch = globalThis.fetch;
  await t.after(() => { globalThis.fetch = originalFetch; });

  await t.test('clears a legacy Supabase cookie instead of treating it as authenticated', async () => {
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard', {
      headers: { Cookie: 'sb-crm-access-token=legacy-token' },
    }));
    assert.equal(response.status, 307);
    assert.match(response.headers.get('set-cookie') ?? '', /sb-crm-access-token=;.*Max-Age=0/);
  });

  await t.test('passes an opaque CRM session only after the server validation endpoint succeeds', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), { status: 200 });
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard', {
      headers: { Cookie: 'crm_session=opaque-session' },
    }));
    assert.equal(response.status, 200);
  });

  await t.test('propagates a validation outage with its request ID instead of redirecting', async () => {
    globalThis.fetch = async () => new Response(null, {
      status: 503,
      headers: { 'X-Request-Id': 'request-123' },
    });
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard', {
      headers: { Cookie: 'crm_session=opaque-session' },
    }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('X-Request-Id'), 'request-123');
  });
});
