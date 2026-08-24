import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { getCrmAccessTokenSecret } from '@/lib/env';

const ACCESS_TOKEN_TTL_SEC = 10 * 60;
const ACCESS_TOKEN_ISSUER = 'the-ant-crm';
const ACCESS_TOKEN_AUDIENCE = 'crm-bff';

type CrmAccessTokenInput = {
  sid: string;
  userId: string | null;
  email: string | null;
  isBreakGlass: boolean;
  supabaseAccessToken: string;
  supabaseAccessTokenExpiresAt: number;
};

export type VerifiedCrmAccessToken = {
  sid: string;
  userId: string | null;
  email: string | null;
  isBreakGlass: boolean;
};

function signingKey(): Uint8Array | null {
  const secret = getCrmAccessTokenSecret();
  return secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

/**
 * Returns null until CRM_ACCESS_TOKEN_SECRET is configured, allowing a safe
 * rolling migration while the legacy durable session remains the fallback.
 */
export async function issueCrmAccessToken(
  input: CrmAccessTokenInput,
): Promise<{ token: string; maxAge: number } | null> {
  const key = signingKey();
  if (!key) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Math.min(input.supabaseAccessTokenExpiresAt, now + ACCESS_TOKEN_TTL_SEC);
  if (expiresAt <= now) return null;

  const token = await new SignJWT({
    sid: input.sid,
    email: input.email,
    bg: input.isBreakGlass,
    ath: tokenFingerprint(input.supabaseAccessToken),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ACCESS_TOKEN_ISSUER)
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setSubject(input.userId ?? 'break-glass')
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(key);

  return { token, maxAge: expiresAt - now };
}

/** Verifies the JWT and binds it to the separate HttpOnly Supabase token cookie. */
export async function verifyCrmAccessToken(
  token: string | undefined,
  supabaseAccessToken: string | undefined,
): Promise<VerifiedCrmAccessToken | null> {
  const key = signingKey();
  if (!key || !token || !supabaseAccessToken) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });
    const sid = typeof payload.sid === 'string' ? payload.sid : null;
    const email = typeof payload.email === 'string' ? payload.email : null;
    const isBreakGlass = payload.bg === true;
    const expectedFingerprint = tokenFingerprint(supabaseAccessToken);
    if (!sid || typeof payload.ath !== 'string' || !safeEqual(payload.ath, expectedFingerprint)) {
      return null;
    }
    if (isBreakGlass) {
      if (payload.sub !== 'break-glass') return null;
      return { sid, userId: null, email: null, isBreakGlass: true };
    }
    if (!payload.sub || payload.sub === 'break-glass') return null;
    return { sid, userId: payload.sub, email, isBreakGlass: false };
  } catch {
    return null;
  }
}
