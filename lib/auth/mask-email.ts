/**
 * Mask a login email for chrome UI (topbar welcome).
 * Keeps the first 2 characters of the local-part; never shows the domain.
 * Star count is stable per email (hash) but not tied to the real address length.
 */

const STAR_MIN = 8;
const STAR_MAX = 14;

/** Deterministic 0..range-1 from a string (stable across SSR / reload). */
function hashToRange(input: string, range: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return range <= 0 ? 0 : h % range;
}

function starCountFor(emailKey: string): number {
  const span = STAR_MAX - STAR_MIN + 1;
  return STAR_MIN + hashToRange(emailKey.toLowerCase(), span);
}

export function maskEmailForDisplay(email: string | null | undefined): string | null {
  if (email == null) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;

  const at = trimmed.indexOf('@');
  const local = at === -1 ? trimmed : trimmed.slice(0, at);
  if (!local) return null;

  const keep = Math.min(2, local.length);
  const prefix = local.slice(0, keep).toLowerCase();
  const stars = '*'.repeat(starCountFor(trimmed));
  return `${prefix}${stars}`;
}
