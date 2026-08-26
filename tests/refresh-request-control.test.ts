import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelSessionRefreshRequest,
  registerSessionRefreshRequest,
} from '../lib/auth/refresh-request-control';

test('logout cancels only the current in-flight session refresh', () => {
  const first = new AbortController();
  const unregisterFirst = registerSessionRefreshRequest(first);
  const second = new AbortController();
  registerSessionRefreshRequest(second);

  unregisterFirst();
  cancelSessionRefreshRequest();

  assert.equal(first.signal.aborted, false);
  assert.equal(second.signal.aborted, true);
});
