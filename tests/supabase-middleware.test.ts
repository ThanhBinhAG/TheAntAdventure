import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import { NextRequest } from 'next/server';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let claimsState: 'valid' | 'unavailable' | 'invalid' = 'valid';

mock.module(require.resolve('@supabase/ssr'), {
  namedExports: {
    createServerClient: () => ({
      auth: {
        getSession: async () => ({
          data: {
            session: {
              access_token: 'supabase-access-token',
              expires_at: Math.floor(Date.now() / 1000) + 600,
              expires_in: 600,
            },
          },
          error: null,
        }),
        getClaims: async () => {
          if (claimsState === 'unavailable') {
            return {
              data: null,
              error: Object.assign(new Error('JWKS service unavailable'), {
                name: 'AuthRetryableFetchError',
                status: 503,
              }),
            };
          }
          if (claimsState === 'invalid') {
            return {
              data: null,
              error: Object.assign(new Error('JWT expired'), { name: 'AuthInvalidJwtError' }),
            };
          }
          return { data: { claims: { sub: 'user-1' } }, error: null };
        },
      },
    }),
  },
});
mock.module(require.resolve('../lib/server/env/supabase'), {
  namedExports: {
    getSupabaseUrl: () => 'https://supabase.example.test',
    getSupabaseAnonKey: () => 'anon-key',
  },
});
mock.module(require.resolve('../lib/system/debug-config'), {
  namedExports: {
    isDebugRoute: () => false,
    isSystemDebugEnabled: () => false,
    verifyDebugRequest: () => false,
  },
});
mock.module(require.resolve('../lib/system/debug-logger'), {
  namedExports: { debugLog: () => {} },
});

test('proxy accepts a verified Supabase SSR session and mirrors its access JWT into an HttpOnly BFF cookie', async (t) => {
  const { updateSession } = await import('../lib/supabase/middleware');

  await t.beforeEach(() => {
    claimsState = 'valid';
  });

  await t.test('accepts verified claims', async () => {
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard'));

    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie') ?? '', /sb-crm-access-token=supabase-access-token/);
  });

  await t.test('keeps valid cookies and returns 503 when JWKS verification is temporarily unavailable', async () => {
    claimsState = 'unavailable';
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard', {
      headers: { Cookie: 'sb-crm-access-token=still-valid-mirror' },
    }));

    assert.equal(response.status, 503);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('retry-after'), '30');
    assert.equal(response.headers.get('set-cookie'), null);
  });

  await t.test('redirects to login only when Supabase marks the JWT as invalid', async () => {
    claimsState = 'invalid';
    const response = await updateSession(new NextRequest('https://crm.example.test/dashboard'));

    assert.equal(response.status, 307);
    assert.match(response.headers.get('location') ?? '', /\/login\?next=%2Fdashboard/);
    assert.match(response.headers.get('set-cookie') ?? '', /sb-crm-access-token=;.*Max-Age=0/);
  });
});
