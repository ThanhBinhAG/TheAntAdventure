import {
  getBreakGlassPassword,
  getBreakGlassUsername,
  isBreakGlassConfigured,
} from '@/lib/server/env/auth';

const textEncoder = new TextEncoder();

function safeEqualStr(a: string, b: string): boolean {
  const actual = textEncoder.encode(a);
  const expected = textEncoder.encode(b);
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index]! ^ expected[index]!;
  }
  return difference === 0;
}

/**
 * Checks recovery credentials before issuing a real Supabase Auth session for
 * the hidden break-glass user. CRM never signs its own break-glass cookie.
 */
export function checkBreakGlassCredentials(username: string, password: string): {
  configured: boolean;
  usernameMatches: boolean;
  passwordMatches: boolean;
} {
  if (!isBreakGlassConfigured()) {
    return { configured: false, usernameMatches: false, passwordMatches: false };
  }

  return {
    configured: true,
    usernameMatches: safeEqualStr(username, getBreakGlassUsername()),
    passwordMatches: safeEqualStr(password, getBreakGlassPassword()),
  };
}
