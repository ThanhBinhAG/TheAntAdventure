import assert from 'node:assert/strict';
import test from 'node:test';
import { getSessionRefreshDelayMs, SESSION_REFRESH_INTERVAL_MS } from '../lib/auth/refresh-backoff';

test('session refresh retries with capped exponential backoff', () => {
  assert.equal(getSessionRefreshDelayMs(1), SESSION_REFRESH_INTERVAL_MS);
  assert.equal(getSessionRefreshDelayMs(2), 2 * SESSION_REFRESH_INTERVAL_MS);
  assert.equal(getSessionRefreshDelayMs(5), 5 * SESSION_REFRESH_INTERVAL_MS);
});

test('session refresh honors a longer server retry window', () => {
  assert.equal(getSessionRefreshDelayMs(1, 180), 180_000);
});
