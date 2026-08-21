import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from '@/lib/env';
import { getRedisClient } from '@/lib/redis/client';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import {
  createDurableCrmSession,
  findDurableCrmSession,
  revokeDurableCrmSession,
  updateDurableCrmSession,
} from '@/lib/auth/crm-session-store';

export const CRM_SESSION_COOKIE = 'crm_session';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;
const REVOKED_SESSION_PREFIX = 'crm:session:revoked:';
const REFRESH_WHEN_REMAINING_SEC = 2 * 60;

export type CrmSession = {
  sid: string;
  userId: string | null;
  email: string | null;
  isBreakGlass: boolean;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  supabaseAccessTokenExpiresAt: number;
  expiresAt: number;
};

type NewCrmSession = Omit<CrmSession, 'sid' | 'expiresAt'>;

function getSessionSecret(): string {
  const secret = (process.env.CRM_SESSION_SECRET ?? '').trim();
  if (secret.length < 32) {
    throw new Error('CRM_SESSION_SECRET phải có tối thiểu 32 ký tự.');
  }
  return secret;
}

function signSessionId(sid: string): string {
  return createHmac('sha256', getSessionSecret()).update(sid).digest('base64url');
}

function encodeCookieValue(sid: string): string {
  return `${sid}.${signSessionId(sid)}`;
}

function decodeCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  const [sid, signature, ...extra] = value.split('.');
  if (!sid || !signature || extra.length) return null;
  const expected = signSessionId(sid);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  return sid;
}

function revokedKeyFor(sid: string): string {
  return `${REVOKED_SESSION_PREFIX}${sid}`;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function encryptionKey(): Buffer {
  return createHash('sha256')
    .update('crm-session-encryption:')
    .update(getSessionSecret())
    .digest();
}

function encryptSession(session: CrmSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function parseSession(ciphertext: string, sid: string): CrmSession | null {
  try {
    const [version, iv, authTag, encrypted, ...extra] = ciphertext.split('.');
    if (version !== 'v1' || !iv || !authTag || !encrypted || extra.length) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64url'));
    const raw = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const session = JSON.parse(raw) as CrmSession;
    if (
      session.sid !== sid ||
      typeof session.userId !== 'string' && session.userId !== null ||
      typeof session.email !== 'string' && session.email !== null ||
      typeof session.isBreakGlass !== 'boolean' ||
      !session.supabaseAccessToken ||
      !session.supabaseRefreshToken ||
      !Number.isFinite(session.supabaseAccessTokenExpiresAt) ||
      !Number.isFinite(session.expiresAt)
    ) return null;
    return session.expiresAt > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}

function expiresAtIso(expiresAt: number): string {
  return new Date(expiresAt * 1000).toISOString();
}

async function isRevokedInRedis(sid: string): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    return Boolean(redis && await redis.get(revokedKeyFor(sid)));
  } catch {
    return false;
  }
}

async function cacheRevocationInRedis(sid: string, expiresAt: number): Promise<void> {
  const ttl = expiresAt - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;
  try {
    const redis = await getRedisClient();
    if (redis) await redis.set(revokedKeyFor(sid), '1', { EX: ttl });
  } catch {
    // PostgreSQL remains authoritative when Redis is unavailable.
  }
}

export async function createCrmSession(input: NewCrmSession): Promise<{
  session: CrmSession;
  cookieValue: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  const session: CrmSession = {
    ...input,
    sid: randomBytes(32).toString('base64url'),
    expiresAt: now + SESSION_TTL_SEC,
  };
  await createDurableCrmSession({
    sid: session.sid,
    payloadCiphertext: encryptSession(session),
    expiresAt: expiresAtIso(session.expiresAt),
    revokedAt: null,
  });
  return { session, cookieValue: encodeCookieValue(session.sid) };
}

export async function getCrmSession(cookieValue: string | undefined): Promise<CrmSession | null> {
  let sid: string | null;
  try {
    sid = decodeCookieValue(cookieValue);
  } catch {
    return null;
  }
  if (!sid) return null;

  if (await isRevokedInRedis(sid)) return null;

  try {
    const stored = await findDurableCrmSession(sid);
    if (!stored || stored.revokedAt || Date.parse(stored.expiresAt) <= Date.now()) return null;
    const session = parseSession(stored.payloadCiphertext, sid);
    if (!session || session.expiresAt !== Math.floor(Date.parse(stored.expiresAt) / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function updateCrmSession(session: CrmSession): Promise<void> {
  const ttl = session.expiresAt - Math.floor(Date.now() / 1000);
  if (ttl <= 0) {
    await revokeDurableCrmSession(session.sid);
    await cacheRevocationInRedis(session.sid, session.expiresAt);
    return;
  }
  await updateDurableCrmSession({
    sid: session.sid,
    payloadCiphertext: encryptSession(session),
    expiresAt: expiresAtIso(session.expiresAt),
    revokedAt: null,
  });
}

/** Refresh Supabase credentials server-side while the CRM session remains valid. */
export async function refreshCrmSessionIfNeeded(session: CrmSession): Promise<CrmSession | null> {
  const now = Math.floor(Date.now() / 1000);
  if (session.supabaseAccessTokenExpiresAt > now + REFRESH_WHEN_REMAINING_SEC) return session;

  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: session.supabaseRefreshToken,
  });
  if (error || !data.session) {
    await revokeCrmSession(encodeCookieValue(session.sid));
    return null;
  }

  const refreshed: CrmSession = {
    ...session,
    supabaseAccessToken: data.session.access_token,
    supabaseRefreshToken: data.session.refresh_token,
    supabaseAccessTokenExpiresAt:
      data.session.expires_at ?? now + (data.session.expires_in ?? 0),
  };
  await updateCrmSession(refreshed);
  return refreshed;
}

export async function revokeCrmSession(cookieValue: string | undefined): Promise<void> {
  let sid: string | null;
  try {
    sid = decodeCookieValue(cookieValue);
  } catch {
    return;
  }
  if (!sid) return;
  let expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  try {
    const stored = await findDurableCrmSession(sid);
    if (stored) expiresAt = Math.floor(Date.parse(stored.expiresAt) / 1000);
  } catch {
    // Revoke below remains the source-of-truth operation and will surface a durable store failure.
  }
  await revokeDurableCrmSession(sid);
  await cacheRevocationInRedis(sid, expiresAt);
}

export function setCrmSessionCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set(CRM_SESSION_COOKIE, cookieValue, cookieOptions(SESSION_TTL_SEC));
}

export function clearCrmSessionCookie(response: NextResponse): void {
  response.cookies.set(CRM_SESSION_COOKIE, '', cookieOptions(0));
}
