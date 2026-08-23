import { NextResponse } from 'next/server';
import { clearBreakGlassCookie } from '@/lib/auth/break-glass';
import { clearCrmSessionCookie, revokeCrmSession, CRM_SESSION_COOKIE } from '@/lib/auth/crm-session';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const cookieHeader = request.headers.get('cookie');

  const crmSessionCookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CRM_SESSION_COOKIE}=`))
    ?.slice(CRM_SESSION_COOKIE.length + 1);
  await revokeCrmSession(crmSessionCookie);
  clearCrmSessionCookie(response);
  clearBreakGlassCookie(response);
  // Explicitly expire every sb-*-auth-token(.N) before/after signOut so nginx
  // never keeps receiving stale chunk cookies after logout.
  clearSupabaseAuthCookies(response, cookieHeader);

  return response;
}
