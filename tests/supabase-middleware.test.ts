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
        getClaims: async () => ({ data: { claims: { sub: 'user-1' } }, error: null }),
      },
    }),
  },
});
mock.module(require.resolve('../lib/env'), {
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

test('proxy accepts a verified Supabase SSR session and mirrors its access JWT into an HttpOnly BFF cookie', async () => {
  const { updateSession } = await import('../lib/supabase/middleware');
  const response = await updateSession(new NextRequest('https://crm.example.test/dashboard'));

  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie') ?? '', /sb-crm-access-token=supabase-access-token/);
});
