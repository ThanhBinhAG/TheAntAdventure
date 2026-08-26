import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSessionRefreshController,
  type SessionRefreshResponse,
} from '../lib/auth/session-refresh-controller';
import { SESSION_REFRESH_INTERVAL_MS } from '../lib/auth/refresh-backoff';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function timerHarness() {
  const timers: Array<{ callback: () => void; delayMs: number; cleared: boolean }> = [];
  return {
    timers,
    setTimer(callback: () => void, delayMs: number) {
      const timer = { callback, delayMs, cleared: false };
      timers.push(timer);
      return timer as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer(timer: ReturnType<typeof setTimeout>) {
      (timer as unknown as { cleared: boolean }).cleared = true;
    },
  };
}

test('Strict-Mode-style remount aborts the first refresh and lets the replacement succeed', async () => {
  const pending: Deferred<SessionRefreshResponse>[] = [];
  let abortedRequests = 0;
  const requestRefresh = (signal: AbortSignal) => {
    const request = deferred<SessionRefreshResponse>();
    signal.addEventListener('abort', () => {
      abortedRequests += 1;
      request.reject(new Error('aborted'));
    }, { once: true });
    pending.push(request);
    return request.promise;
  };
  const first = createSessionRefreshController({
    getVisibilityState: () => 'visible', requestRefresh, onUnauthenticated: () => assert.fail('must not redirect'),
  });
  first.start();
  first.stop();
  await settle();

  const timers = timerHarness();
  const second = createSessionRefreshController({
    getVisibilityState: () => 'visible', requestRefresh, onUnauthenticated: () => assert.fail('must not redirect'),
    ...timers,
  });
  second.start();
  pending[1].resolve({ status: 200 });
  await settle();

  assert.equal(pending.length, 2);
  assert.equal(abortedRequests, 1);
  assert.equal(timers.timers.at(-1)?.delayMs, SESSION_REFRESH_INTERVAL_MS);
  second.stop();
});

test('a hidden tab defers refresh, then performs exactly one refresh when visible', async () => {
  let visibility: 'visible' | 'hidden' = 'hidden';
  let requests = 0;
  const timers = timerHarness();
  const controller = createSessionRefreshController({
    getVisibilityState: () => visibility,
    requestRefresh: async () => {
      requests += 1;
      return { status: 200 };
    },
    onUnauthenticated: () => assert.fail('must not redirect'),
    ...timers,
  });

  controller.start();
  assert.equal(requests, 0);
  assert.equal(timers.timers[0]?.delayMs, SESSION_REFRESH_INTERVAL_MS);

  visibility = 'visible';
  controller.refreshOnVisible();
  controller.refreshOnVisible();
  await settle();

  assert.equal(requests, 1);
  assert.equal(timers.timers.filter((timer) => !timer.cleared).length, 1);
  controller.stop();
});

test('a 401 redirects to login and does not schedule another refresh', async () => {
  let redirects = 0;
  const timers = timerHarness();
  const controller = createSessionRefreshController({
    getVisibilityState: () => 'visible',
    requestRefresh: async () => ({ status: 401 }),
    onUnauthenticated: () => { redirects += 1; },
    ...timers,
  });

  controller.start();
  await settle();

  assert.equal(redirects, 1);
  assert.equal(timers.timers.length, 0);
});

test('a 503 keeps the session UI active and schedules retry backoff', async () => {
  let redirects = 0;
  const timers = timerHarness();
  const controller = createSessionRefreshController({
    getVisibilityState: () => 'visible',
    requestRefresh: async () => ({ status: 503, retryAfterSeconds: 180 }),
    onUnauthenticated: () => { redirects += 1; },
    ...timers,
  });

  controller.start();
  await settle();

  assert.equal(redirects, 0);
  assert.equal(timers.timers.at(-1)?.delayMs, 180_000);
  controller.stop();
});

test('successful checks run every minute, covering the near-expiry refresh window', async () => {
  let requests = 0;
  const timers = timerHarness();
  const controller = createSessionRefreshController({
    getVisibilityState: () => 'visible',
    requestRefresh: async () => {
      requests += 1;
      return { status: 200 };
    },
    onUnauthenticated: () => assert.fail('must not redirect'),
    ...timers,
  });

  controller.start();
  await settle();
  const firstCheck = timers.timers.at(-1);
  assert.equal(firstCheck?.delayMs, SESSION_REFRESH_INTERVAL_MS);

  firstCheck?.callback();
  await settle();
  assert.equal(requests, 2);
  assert.equal(timers.timers.at(-1)?.delayMs, SESSION_REFRESH_INTERVAL_MS);
  controller.stop();
});
