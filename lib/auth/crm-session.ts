import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseAnonKey, getServerSupabaseUrl } from '@/lib/env';
import { getRedisClient } from '@/lib/redis/client';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export const CRM_SESSION_COOKIE = 'crm_session';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;
const SESSION_PREFIX = 'crm:session:';
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

function keyFor(sid: string): string {
  return `${SESSION_PREFIX}${sid}`;
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

function parseSession(raw: string, sid: string): CrmSession | null {
  try {
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

export async function createCrmSession(input: NewCrmSession): Promise<{
  session: CrmSession;
  cookieValue: string;
}> {
  const redis = await getRedisClient();
  if (!redis) throw new Error('CRM session store không khả dụng.');

  const now = Math.floor(Date.now() / 1000);
  const session: CrmSession = {
    ...input,
    sid: randomBytes(32).toString('base64url'),
    expiresAt: now + SESSION_TTL_SEC,
  };
  await redis.set(keyFor(session.sid), JSON.stringify(session), { EX: SESSION_TTL_SEC });
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

  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(keyFor(sid));
  if (!raw) return null;

  const session = parseSession(raw, sid);
  if (!session) {
    await redis.del(keyFor(sid));
    return null;
  }
  return session;
}

export async function updateCrmSession(session: CrmSession): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) throw new Error('CRM session store không khả dụng.');
  const ttl = session.expiresAt - Math.floor(Date.now() / 1000);
  if (ttl <= 0) {
    await redis.del(keyFor(session.sid));
    return;
  }
  await redis.set(keyFor(session.sid), JSON.stringify(session), { EX: ttl });
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
  const redis = await getRedisClient();
  if (redis) await redis.del(keyFor(sid));
}

export function setCrmSessionCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set(CRM_SESSION_COOKIE, cookieValue, cookieOptions(SESSION_TTL_SEC));
}

export function clearCrmSessionCookie(response: NextResponse): void {
  response.cookies.set(CRM_SESSION_COOKIE, '', cookieOptions(0));
}
