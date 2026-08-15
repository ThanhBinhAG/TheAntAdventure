import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  getAppUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '../lib/env';

describe('supabase env resolve', () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    appUrl: process.env.APP_URL,
    allowLocal: process.env.NEXT_PUBLIC_ALLOW_LOCAL_SUPABASE,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries({
      NEXT_PUBLIC_SUPABASE_URL: original.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: original.anon,
      SUPABASE_SERVICE_ROLE_KEY: original.service,
      APP_URL: original.appUrl,
      NEXT_PUBLIC_ALLOW_LOCAL_SUPABASE: original.allowLocal,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('falls back to self-host when env URL is localhost', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'local-anon';

    assert.equal(getSupabaseUrl(), 'https://sb.mitelai.com:9001');
    assert.equal(getSupabaseAnonKey(), 'sb_publishable_ZaiYXiw9LBetFyrpiP4R0Q_jDocbYJq');
    assert.match(getSupabaseServiceRoleKey(), /^eyJ/);
  });

  it('falls back to self-host when URL is empty', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    assert.equal(getSupabaseUrl(), 'https://sb.mitelai.com:9001');
    assert.equal(getSupabaseAnonKey(), 'sb_publishable_ZaiYXiw9LBetFyrpiP4R0Q_jDocbYJq');
  });

  it('keeps explicit https URL from env', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'remote-anon';

    assert.equal(getSupabaseUrl(), 'https://example.supabase.co');
    assert.equal(getSupabaseAnonKey(), 'remote-anon');
  });

  it('uses company APP_URL when env still points at localhost Supabase', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.APP_URL = 'http://localhost:3006';

    assert.equal(getAppUrl(), 'https://theantcrmdemo.mitelai.com/');
  });
  it('keeps localhost when local Supabase is explicitly allowed', () => {
    process.env.NEXT_PUBLIC_ALLOW_LOCAL_SUPABASE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'local-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'local-service-role';

    assert.equal(getSupabaseUrl(), 'http://127.0.0.1:54321');
    assert.equal(getSupabaseAnonKey(), 'local-anon');
    assert.equal(getSupabaseServiceRoleKey(), 'local-service-role');
  });
});
