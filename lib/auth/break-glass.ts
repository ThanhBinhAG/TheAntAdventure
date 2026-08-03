import type { NextRequest, NextResponse } from 'next/server';
import {
  getBreakGlassPassword,
  getBreakGlassSessionSecret,
  getBreakGlassUsername,
  isBreakGlassConfigured,
} from '@/lib/env';

export const BG_SESSION_COOKIE = 'bg_session';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
const REFRESH_WHEN_ACCESS_REMAINING_SEC = 2 * 60;

type SessionPayload = {
  v: 1;
  sid: string;
  accessExp: number;
  refreshExp: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function safeEqualStr(a: string, b: string): boolean {
  const ab = textEncoder.encode(a);
  const bb = textEncoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadB64));
  return bytesToBase64Url(new Uint8Array(sig));
}

async function encodeSession(payload: SessionPayload, secret: string): Promise<string> {
  const payloadB64 = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const sig = await sign(payloadB64, secret);
  return `v1.${payloadB64}.${sig}`;
}

async function decodeSession(token: string, secret: string): Promise<SessionPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  const expected = await sign(payloadB64, secret);
  if (!safeEqualStr(sig, expected)) return null;
  try {
    const raw = JSON.parse(textDecoder.decode(base64UrlToBytes(payloadB64))) as SessionPayload;
    if (raw?.v !== 1 || typeof raw.sid !== 'string') return null;
    if (typeof raw.accessExp !== 'number' || typeof raw.refreshExp !== 'number') return null;
    return raw;
  } catch {
    return null;
  }
}

function randomSid(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function verifyBreakGlassCredentials(username: string, password: string): boolean {
  if (!isBreakGlassConfigured()) return false;
  const expectedUser = getBreakGlassUsername();
  const expectedPass = getBreakGlassPassword();
  return safeEqualStr(username, expectedUser) && safeEqualStr(password, expectedPass);
}

export async function mintBreakGlassSession(): Promise<{ token: string; maxAge: number }> {
  const secret = getBreakGlassSessionSecret();
  if (!secret) throw new Error('BREAK_GLASS_SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: 1,
    sid: randomSid(),
    accessExp: now + ACCESS_TTL_SEC,
    refreshExp: now + REFRESH_TTL_SEC,
  };
  return { token: await encodeSession(payload, secret), maxAge: REFRESH_TTL_SEC };
}

export type BreakGlassCheck =
  | { valid: false }
  | { valid: true; needsRefresh: boolean; token?: string; maxAge?: number };

/** Validate cookie; optionally rotate when access is near expiry but refresh is valid. */
export async function checkBreakGlassSession(token: string | undefined): Promise<BreakGlassCheck> {
  if (!token || !isBreakGlassConfigured()) return { valid: false };
  const secret = getBreakGlassSessionSecret();
  if (!secret) return { valid: false };
  const payload = await decodeSession(token, secret);
  if (!payload) return { valid: false };
  const now = Math.floor(Date.now() / 1000);
  if (payload.refreshExp <= now) return { valid: false };
  if (payload.accessExp > now + REFRESH_WHEN_ACCESS_REMAINING_SEC) {
    return { valid: true, needsRefresh: false };
  }
  const rotated = await mintBreakGlassSession();
  return { valid: true, needsRefresh: true, token: rotated.token, maxAge: rotated.maxAge };
}

export function breakGlassCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setBreakGlassCookie(
  response: NextResponse,
  token: string,
  maxAge: number,
): void {
  response.cookies.set(BG_SESSION_COOKIE, token, breakGlassCookieOptions(maxAge));
}

export function clearBreakGlassCookie(response: NextResponse): void {
  response.cookies.set(BG_SESSION_COOKIE, '', breakGlassCookieOptions(0));
}

export function readBreakGlassCookie(
  request: NextRequest | Request,
): string | undefined {
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    return request.cookies.get(BG_SESSION_COOKIE)?.value;
  }
  const header = request.headers.get('cookie') ?? '';
  const match = header.match(/(?:^|;\s*)bg_session=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export async function isBreakGlassSessionValid(token: string | undefined): Promise<boolean> {
  return (await checkBreakGlassSession(token)).valid;
}

const BREAK_GLASS_ACTOR = {
  authenticated: true as const,
  isSuperAdmin: true as const,
  isBreakGlass: true as const,
  userId: null,
  email: null,
};

/** Edge-safe: used from middleware without pulling Node-only session helpers. */
export async function getBreakGlassAuthFromRequest(request: NextRequest): Promise<{
  context: typeof BREAK_GLASS_ACTOR | null;
  refresh?: { token: string; maxAge: number };
}> {
  const token = readBreakGlassCookie(request);
  const check = await checkBreakGlassSession(token);
  if (!check.valid) return { context: null };
  return {
    context: BREAK_GLASS_ACTOR,
    refresh:
      check.needsRefresh && check.token && check.maxAge != null
        ? { token: check.token, maxAge: check.maxAge }
        : undefined,
  };
}
