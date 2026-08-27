import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import { NextResponse } from 'next/server';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let capturedOptions: Record<string, unknown> | null = null;

mock.module(require.resolve('@supabase/ssr'), {
  namedExports: {
    createServerClient: (_url: string, _key: string, options: Record<string, unknown>) => {
      capturedOptions = options;
      return { auth: {} };
    },
  },
});
mock.module(require.resolve('../lib/server/env/supabase'), {
  namedExports: {
    getSupabaseUrl: () => 'https://supabase.example.test',
    getSupabaseAnonKey: () => 'anon-key',
  },
});
mock.module(require.resolve('../lib/supabase/insecure-fetch'), {
  namedExports: { getSupabaseGlobalFetchOptions: () => ({}) },
});

test('Supabase SSR route client writes only secure HttpOnly auth cookies and no-store headers', async () => {
  const { createSupabaseRouteClient } = await import('../lib/auth/supabase-ssr');
  const originalNodeEnv = process.env.NODE_ENV;
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.NODE_ENV = 'production';
  try {
    const response = NextResponse.json({ ok: true });
    createSupabaseRouteClient(new Request('https://crm.example.test/api/auth/login'), response);

    assert.ok(capturedOptions);
    const cookieMethods = (capturedOptions as {
      cookies: { setAll: (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>, headers: Record<string, string>) => void };
    }).cookies;
    cookieMethods.setAll([{
      name: 'sb-project-auth-token',
      value: 'session-value',
      options: { maxAge: 3600 },
    }], { 'Cache-Control': 'private, no-store' });

    const setCookie = response.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /sb-project-auth-token=session-value/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /Secure/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  } finally {
    mutableEnv.NODE_ENV = originalNodeEnv;
  }
});

test('Supabase SSR route client reads cookies without re-wrapping a proxied Route Handler request', async () => {
  const { createSupabaseRouteClient } = await import('../lib/auth/supabase-ssr');
  const response = NextResponse.json({ ok: true });
  const request = new Proxy(new Request('https://crm.example.test/api/auth/login', {
    headers: { cookie: 'sb-project-auth-token=session-value; theme=dark' },
  }), {
    get(target, property, receiver) {
      if (property === 'headers') return target.headers;
      return Reflect.get(target, property, receiver);
    },
  });

  assert.doesNotThrow(() => createSupabaseRouteClient(request, response));
  const cookieMethods = (capturedOptions as {
    cookies: { getAll: () => Array<{ name: string; value: string }> };
  }).cookies;
  assert.deepEqual(cookieMethods.getAll(), [
    { name: 'sb-project-auth-token', value: 'session-value' },
    { name: 'theme', value: 'dark' },
  ]);
});
