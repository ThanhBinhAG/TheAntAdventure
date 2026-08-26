import { getSessionRefreshDelayMs, SESSION_REFRESH_INTERVAL_MS } from './refresh-backoff';

type VisibilityState = 'visible' | 'hidden';
type TimerHandle = ReturnType<typeof setTimeout>;

export type SessionRefreshResponse = {
  status: number;
  retryAfterSeconds?: number;
};

export type SessionRefreshControllerOptions = {
  getVisibilityState: () => VisibilityState;
  requestRefresh: (signal: AbortSignal) => Promise<SessionRefreshResponse>;
  onUnauthenticated: () => void;
  registerRequest?: (controller: AbortController) => () => void;
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
};

/**
 * Browser-session renewal scheduling, kept independent of React so the
 * cancellation and retry contract can be tested without a DOM test library.
 */
export function createSessionRefreshController(options: SessionRefreshControllerOptions) {
  const setTimer = options.setTimer ?? ((callback, delayMs) => globalThis.setTimeout(callback, delayMs));
  const clearTimer = options.clearTimer ?? ((timer) => globalThis.clearTimeout(timer));
  let refreshing = false;
  let stopped = false;
  let failedAttempts = 0;
  let timer: TimerHandle | undefined;
  let inFlight: AbortController | undefined;
  let unregisterRequest: (() => void) | undefined;

  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer !== undefined) clearTimer(timer);
    timer = setTimer(() => {
      timer = undefined;
      void refreshIfNeeded();
    }, delayMs);
  };

  const refreshIfNeeded = async (): Promise<void> => {
    if (stopped || refreshing) return;
    if (options.getVisibilityState() === 'hidden') {
      schedule(SESSION_REFRESH_INTERVAL_MS);
      return;
    }

    refreshing = true;
    const controller = new AbortController();
    inFlight = controller;
    unregisterRequest = options.registerRequest?.(controller);
    try {
      const response = await options.requestRefresh(controller.signal);
      if (stopped) return;
      if (response.status === 401) {
        options.onUnauthenticated();
        return;
      }
      if (response.status < 200 || response.status >= 300) {
        failedAttempts += 1;
        schedule(getSessionRefreshDelayMs(failedAttempts, response.retryAfterSeconds));
        return;
      }
      failedAttempts = 0;
      schedule(SESSION_REFRESH_INTERVAL_MS);
    } catch {
      if (stopped || controller.signal.aborted) return;
      failedAttempts += 1;
      schedule(getSessionRefreshDelayMs(failedAttempts));
    } finally {
      unregisterRequest?.();
      unregisterRequest = undefined;
      if (inFlight === controller) inFlight = undefined;
      refreshing = false;
    }
  };

  return {
    start() {
      stopped = false;
      void refreshIfNeeded();
    },
    stop() {
      stopped = true;
      if (timer !== undefined) clearTimer(timer);
      timer = undefined;
      inFlight?.abort();
      inFlight = undefined;
      unregisterRequest?.();
      unregisterRequest = undefined;
    },
    refreshOnVisible() {
      if (options.getVisibilityState() !== 'visible') return;
      if (timer !== undefined) clearTimer(timer);
      timer = undefined;
      void refreshIfNeeded();
    },
  };
}
