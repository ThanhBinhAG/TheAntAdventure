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

test('the insecure Supabase TLS escape hatch is explicit, local, and never production', async () => {
  const { shouldUseInsecureTlsForUrl } = await import('../lib/supabase/tls-config');
  const env = process.env as Record<string, string | undefined>;
  const previous = {
    nodeEnv: env.NODE_ENV,
    insecure: env.SUPABASE_TLS_INSECURE,
    supabaseUrl: env.SUPABASE_URL,
  };
  env.SUPABASE_URL = 'https://supabase.example.test';
  try {
    env.NODE_ENV = 'production';
    env.SUPABASE_TLS_INSECURE = 'true';
    assert.equal(shouldUseInsecureTlsForUrl('https://supabase.example.test/auth/v1/.well-known/jwks.json'), false);

    env.NODE_ENV = 'development';
    assert.equal(shouldUseInsecureTlsForUrl('https://supabase.example.test/auth/v1/.well-known/jwks.json'), true);
    assert.equal(shouldUseInsecureTlsForUrl('https://attacker.example.test/auth/v1/.well-known/jwks.json'), false);
  } finally {
    if (previous.nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previous.nodeEnv;
    if (previous.insecure === undefined) delete env.SUPABASE_TLS_INSECURE;
    else env.SUPABASE_TLS_INSECURE = previous.insecure;
    if (previous.supabaseUrl === undefined) delete env.SUPABASE_URL;
    else env.SUPABASE_URL = previous.supabaseUrl;
  }
});
