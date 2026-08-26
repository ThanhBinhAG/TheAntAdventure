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

let updateInput: Record<string, unknown> | null = null;

mock.module(require.resolve('@supabase/supabase-js'), {
  namedExports: {
    createClient: () => ({
      auth: {
        admin: {
          updateUserById: async (_userId: string, input: Record<string, unknown>) => {
            updateInput = input;
            return { error: null };
          },
        },
      },
    }),
  },
});
mock.module(require.resolve('../lib/env'), {
  namedExports: {
    getSupabaseServiceRoleKey: () => 'service-role-key',
    getSupabaseUrl: () => 'https://supabase.example.test',
  },
});
mock.module(require.resolve('../lib/supabase/insecure-fetch'), {
  namedExports: { getSupabaseGlobalFetchOptions: () => ({}) },
});
mock.module(require.resolve('../lib/auth/break-glass-supabase'), {
  namedExports: { BREAK_GLASS_SHADOW_EMAIL: 'breakglass.internal@invalid' },
});

test('Access Control bans or unbans the Supabase Auth user when account status changes', async () => {
  const { setAccessControlAuthUserActive } = await import('../lib/auth/access-control-admin');

  updateInput = null;
  await setAccessControlAuthUserActive('user-1', false);
  assert.deepEqual(updateInput, { ban_duration: '876000h' });

  updateInput = null;
  await setAccessControlAuthUserActive('user-1', true);
  assert.deepEqual(updateInput, { ban_duration: 'none' });
});
