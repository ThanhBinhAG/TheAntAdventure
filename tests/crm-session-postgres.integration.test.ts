import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const enabled = process.env.CRM_SESSION_POSTGRES_INTEGRATION === '1';

test('durable CRM session survives Redis-down and revokes through PostgreSQL', { skip: enabled ? undefined : 'Set CRM_SESSION_POSTGRES_INTEGRATION=1 to run' }, async () => {
  const originalRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = '';
  const sessions = await import('../lib/auth/crm-session');
  const { getServerSupabaseUrl, getSupabaseServiceRoleKey } = await import('../lib/env');
  const admin = createClient(getServerSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { session, cookieValue } = await sessions.createCrmSession({
    userId: 'postgres-integration-user',
    email: 'postgres@example.test',
    isBreakGlass: false,
    supabaseAccessToken: 'postgres-integration-access-token',
    supabaseRefreshToken: 'postgres-integration-refresh-token',
    supabaseAccessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
  });

  try {
    assert.equal((await sessions.getCrmSession(cookieValue))?.userId, 'postgres-integration-user');
    const { data, error } = await admin
      .from('crm_sessions')
      .select('payload_ciphertext')
      .eq('sid', session.sid)
      .single();
    assert.equal(error, null);
    assert.ok(!String(data?.payload_ciphertext).includes('postgres-integration-access-token'));

    await sessions.revokeCrmSession(cookieValue);
    assert.equal(await sessions.getCrmSession(cookieValue), null);
  } finally {
    await admin.from('crm_sessions').delete().eq('sid', session.sid);
    process.env.REDIS_URL = originalRedisUrl;
  }
});
