/** Shared helpers for auth-session diagnostics (no server-only deps). */

export function isExpectedUnauthenticatedSessionError(message: string): boolean {
  return /auth session missing/i.test(message);
}
