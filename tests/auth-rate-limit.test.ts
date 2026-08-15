import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from '../lib/auth/rate-limit';
import {
  getBreakGlassPassword,
  getBreakGlassSessionSecret,
  getBreakGlassUsername,
  isBreakGlassConfigured,
} from '../lib/env';

describe('auth env helpers — break-glass', () => {
  const keys = [
    'BREAK_GLASS_USERNAME',
    'BREAK_GLASS_PASSWORD',
    'BREAK_GLASS_SESSION_SECRET',
  ] as const;
  const originals: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const k of keys) {
      if (originals[k] === undefined) delete process.env[k];
      else process.env[k] = originals[k];
    }
  });

  for (const k of keys) {
    originals[k] = process.env[k];
  }

  it('isBreakGlassConfigured requires all three env vars', () => {
    delete process.env.BREAK_GLASS_USERNAME;
    delete process.env.BREAK_GLASS_PASSWORD;
    delete process.env.BREAK_GLASS_SESSION_SECRET;
    assert.equal(isBreakGlassConfigured(), false);

    process.env.BREAK_GLASS_USERNAME = 'bg';
    process.env.BREAK_GLASS_PASSWORD = 'secret';
    process.env.BREAK_GLASS_SESSION_SECRET = 'hmac';
    assert.equal(isBreakGlassConfigured(), true);
    assert.equal(getBreakGlassUsername(), 'bg');
    assert.equal(getBreakGlassPassword(), 'secret');
    assert.equal(getBreakGlassSessionSecret(), 'hmac');
  });
});

describe('login rate limit', () => {
  it('blocks after max failures in window', async () => {
    const key = `test-ip-${Date.now()}-${Math.random()}`;
    const originalRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;

    try {
      assert.equal((await checkLoginRateLimit(key)).ok, true);
      for (let i = 0; i < 10; i++) await recordLoginFailure(key);
      const blocked = await checkLoginRateLimit(key);
      assert.equal(blocked.ok, false);
      if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
      await clearLoginFailures(key);
      assert.equal((await checkLoginRateLimit(key)).ok, true);
    } finally {
      if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = originalRedisUrl;
    }
  });
});
