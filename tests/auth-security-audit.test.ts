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

let inserted: Record<string, unknown> | null = null;

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getAdminSupabaseClient: () => ({
      from: () => ({
        insert: async (value: Record<string, unknown>) => {
          inserted = value;
          return { error: null };
        },
      }),
    }),
  },
});

test('records an auth security event with a hashed IP and never exposes raw client metadata', async () => {
  const { recordAuthSecurityEvent } = await import('../lib/auth/security-audit');
  inserted = null;

  await recordAuthSecurityEvent({
    eventType: 'refresh_succeeded',
    userId: 'user-1',
    sessionId: 'session-1',
    ip: '203.0.113.10',
  });

  const event = inserted as unknown as Record<string, unknown>;
  assert.equal(event.event_type, 'refresh_succeeded');
  assert.equal(event.user_id, 'user-1');
  assert.equal(event.session_id, 'session-1');
  assert.match(String(event.ip_hash), /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(event), /203\.0\.113\.10/);
});
