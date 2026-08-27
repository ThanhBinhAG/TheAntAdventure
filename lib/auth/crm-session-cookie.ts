import 'server-only';

import type { NextResponse } from 'next/server';

export const CRM_SESSION_COOKIE = 'crm_session';
export const CRM_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createCrmSessionExpiry(now = Date.now()): Date {
  return new Date(now + CRM_SESSION_TTL_MS);
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

export function setCrmSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  response.cookies.set(CRM_SESSION_COOKIE, token, cookieOptions(maxAge));
}

export function clearCrmSessionCookie(response: NextResponse): void {
  response.cookies.set(CRM_SESSION_COOKIE, '', cookieOptions(0));
}

export function readCrmSessionToken(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(';')) {
    const [name, ...value] = item.trim().split('=');
    if (name === CRM_SESSION_COOKIE) return value.join('=') || null;
  }
  return null;
}
