export const SESSION_REFRESH_INTERVAL_MS = 60 * 1000;
const SESSION_REFRESH_MAX_BACKOFF_MS = 5 * 60 * 1000;

export function getSessionRefreshDelayMs(failedAttempts: number, retryAfterSeconds?: number): number {
  const exponentialDelay = Math.min(
    SESSION_REFRESH_INTERVAL_MS * 2 ** Math.max(0, failedAttempts - 1),
    SESSION_REFRESH_MAX_BACKOFF_MS,
  );
  const retryAfterDelay = Number.isFinite(retryAfterSeconds)
    ? Math.max(0, (retryAfterSeconds ?? 0) * 1000)
    : 0;
  return Math.max(exponentialDelay, retryAfterDelay);
}
