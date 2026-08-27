import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let cachedState: unknown = null;
let cachedUserId: string | null = null;
let profileResult: { data: { is_active: boolean; authz_version: number } | null; error: Error | null } = {
  data: { is_active: true, authz_version: 4 },
  error: null,
};

mock.module(require.resolve('../lib/redis/authz-state'), {
  namedExports: {
    getCachedAuthzState: async () => null,
    setCachedAuthzState: async (userId: string, state: unknown) => {
      cachedUserId = userId;
      cachedState = state;
      return true;
    },
  },
});
mock.module(require.resolve('@supabase/supabase-js'), {
  namedExports: {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => profileResult,
          }),
        }),
      }),
    }),
  },
});
mock.module(require.resolve('../lib/server/env/supabase'), {
  namedExports: {
    getSupabaseAnonKey: () => 'anon-key',
    getSupabaseUrl: () => 'https://supabase.example.test',
  },
});
mock.module(require.resolve('../lib/supabase/insecure-fetch'), {
  namedExports: { getSupabaseGlobalFetchOptions: () => ({}) },
});

test('loads the active authorization state once and caches its database version', async () => {
  const { getCurrentAuthzState } = await import('../lib/auth/authz-state');
  cachedState = null;
  cachedUserId = null;

  const state = await getCurrentAuthzState({
    userId: 'user-1',
    accessToken: 'supabase-access-token',
  });

  assert.deepEqual(state, { isActive: true, version: 4 });
  assert.equal(cachedUserId, 'user-1');
  assert.deepEqual(cachedState, { isActive: true, version: 4 });
});

test('reports an unavailable authorization lookup separately from an inactive account', async () => {
  const { getCurrentAuthzStateResult } = await import('../lib/auth/authz-state');
  profileResult = { data: null, error: new Error('Supabase unavailable') };
  try {
    assert.deepEqual(await getCurrentAuthzStateResult({
      userId: 'user-1',
      accessToken: 'supabase-access-token',
    }), { status: 'unavailable' });
  } finally {
    profileResult = { data: { is_active: true, authz_version: 4 }, error: null };
  }
});
