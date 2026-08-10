import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  isSupabaseTlsInsecureEnabled,
  shouldUseInsecureTlsForUrl,
} from '../lib/supabase/tls-config';
import { isExpectedUnauthenticatedSessionError } from '../lib/system/session-diag';

describe('supabase insecure TLS fetch helpers', () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    tls: process.env.SUPABASE_TLS_INSECURE,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries({
      NEXT_PUBLIC_SUPABASE_URL: original.url,
      SUPABASE_TLS_INSECURE: original.tls,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('enables insecure TLS for company host by default', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.mitelai.com:9001';
    delete process.env.SUPABASE_TLS_INSECURE;
    assert.equal(isSupabaseTlsInsecureEnabled(), true);
    assert.equal(shouldUseInsecureTlsForUrl('https://sb.mitelai.com:9001/auth/v1/health'), true);
  });

  it('does not use insecure TLS for localhost http', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_TLS_INSECURE = 'false';
    assert.equal(shouldUseInsecureTlsForUrl('http://127.0.0.1:54321/auth/v1/health'), false);
  });

  it('respects SUPABASE_TLS_INSECURE=false even on company host', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.mitelai.com:9001';
    process.env.SUPABASE_TLS_INSECURE = 'false';
    assert.equal(isSupabaseTlsInsecureEnabled(), false);
    assert.equal(shouldUseInsecureTlsForUrl('https://sb.mitelai.com:9001/auth/v1/health'), false);
  });
});

describe('diagnostics session missing', () => {
  it('treats Auth session missing as expected when not logged in', () => {
    assert.equal(isExpectedUnauthenticatedSessionError('Auth session missing!'), true);
    assert.equal(isExpectedUnauthenticatedSessionError('fetch failed'), false);
  });
});
