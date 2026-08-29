import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

test('server Supabase configuration reads only private runtime variables', async () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = {
    url: env.SUPABASE_URL,
    anon: env.SUPABASE_ANON_KEY,
    publicUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    publicAnon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  env.SUPABASE_URL = '  http://supabase-gateway:8000/  ';
  env.SUPABASE_ANON_KEY = '  server-anon-key  ';
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://public.example.test';
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

  try {
    const config = await import('../lib/server/env/supabase');
    assert.equal(config.getSupabaseUrl(), 'http://supabase-gateway:8000/');
    assert.equal(config.getSupabaseAnonKey(), 'server-anon-key');

    delete env.SUPABASE_URL;
    delete env.SUPABASE_ANON_KEY;
    assert.equal(config.getSupabaseUrl(), '');
    assert.equal(config.getSupabaseAnonKey(), '');
  } finally {
    if (previous.url === undefined) delete env.SUPABASE_URL;
    else env.SUPABASE_URL = previous.url;
    if (previous.anon === undefined) delete env.SUPABASE_ANON_KEY;
    else env.SUPABASE_ANON_KEY = previous.anon;
    if (previous.publicUrl === undefined) delete env.NEXT_PUBLIC_SUPABASE_URL;
    else env.NEXT_PUBLIC_SUPABASE_URL = previous.publicUrl;
    if (previous.publicAnon === undefined) delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.publicAnon;
  }
});

test('container builds never receive Supabase configuration', async () => {
  const root = process.cwd();
  const [dockerfile, compose, localCompose] = await Promise.all([
    readFile(path.join(root, 'Dockerfile'), 'utf8'),
    readFile(path.join(root, 'docker-compose.yml'), 'utf8'),
    readFile(path.join(root, 'docker-compose.local.yml'), 'utf8'),
  ]);

  assert.doesNotMatch(dockerfile, /^\s*(?:ARG|ENV)\s+(?:NEXT_PUBLIC_)?SUPABASE_/m);
  for (const source of [compose, localCompose]) {
    assert.doesNotMatch(source, /^\s+(?:NEXT_PUBLIC_)?SUPABASE_[A-Z_]+:/m);
    assert.doesNotMatch(source, /^\s+(?:NEXT_PUBLIC_)?SUPABASE_[A-Z_]+=/m);
  }
});
