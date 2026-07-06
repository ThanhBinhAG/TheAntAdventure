import type { NextRequest } from 'next/server';

export function isSystemDebugEnabled(): boolean {
  const v = (process.env.SYSTEM_DEBUG ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

export function getSystemDebugToken(): string {
  return (process.env.SYSTEM_DEBUG_TOKEN ?? '').trim();
}

export function isValidDebugToken(token: string | null | undefined): boolean {
  if (!isSystemDebugEnabled()) return false;
  const expected = getSystemDebugToken();
  if (!expected || !token) return false;
  return token === expected;
}

export function extractDebugToken(request: NextRequest | Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('token');
  if (fromQuery) return fromQuery;
  return request.headers.get('x-debug-token');
}

export function verifyDebugRequest(request: NextRequest | Request): boolean {
  return isValidDebugToken(extractDebugToken(request));
}

export function isDebugRoute(pathname: string): boolean {
  return pathname === '/system/debug' || pathname.startsWith('/api/system/');
}

export function maskSecret(value: string, visibleStart = 6, visibleEnd = 4): string {
  if (!value) return '(empty)';
  if (value.length <= visibleStart + visibleEnd) return '***';
  return `${value.slice(0, visibleStart)}...${value.slice(-visibleEnd)}`;
}
