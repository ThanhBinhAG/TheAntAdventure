import type { NextResponse } from 'next/server';

/** Match Supabase SSR auth cookies including chunk suffixes (.0, .1, …). */
export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('-auth-token');
}

/**
 * Clear every Supabase auth cookie present on the request (including chunked
 * `sb-*-auth-token.N` leftovers that signOut may miss after project ref changes).
 */
export function clearSupabaseAuthCookies(
  response: NextResponse,
  cookieHeader: string | null | undefined
): void {
  if (!cookieHeader) return;
  const names = new Set<string>();
  for (const part of cookieHeader.split(';')) {
    const name = part.trim().split('=')[0]?.trim();
    if (name && isSupabaseAuthCookieName(name)) names.add(name);
  }
  for (const name of names) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
}

/** Estimate Cookie request-header size (bytes, UTF-8). */
export function estimateCookieHeaderBytes(cookieHeader: string | null | undefined): {
  bytes: number;
  cookieCount: number;
  authChunkCount: number;
  hasBreakGlass: boolean;
} {
  const header = cookieHeader ?? '';
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(header).length
      : Buffer.byteLength(header, 'utf8');
  const parts = header
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  let authChunkCount = 0;
  let hasBreakGlass = false;
  for (const part of parts) {
    const name = part.split('=')[0]?.trim() ?? '';
    if (isSupabaseAuthCookieName(name)) authChunkCount += 1;
    if (name === 'bg_session') hasBreakGlass = true;
  }
  return { bytes, cookieCount: parts.length, authChunkCount, hasBreakGlass };
}
