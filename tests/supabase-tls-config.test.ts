import assert from 'node:assert/strict';
import test from 'node:test';

test('the insecure Supabase TLS escape hatch is explicit, local, and never production', async () => {
  const { shouldUseInsecureTlsForUrl } = await import('../lib/supabase/tls-config');
  const env = process.env as Record<string, string | undefined>;
  const previous = {
    nodeEnv: env.NODE_ENV,
    insecure: env.SUPABASE_TLS_INSECURE,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  };
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
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
    if (previous.supabaseUrl === undefined) delete env.NEXT_PUBLIC_SUPABASE_URL;
    else env.NEXT_PUBLIC_SUPABASE_URL = previous.supabaseUrl;
  }
});
