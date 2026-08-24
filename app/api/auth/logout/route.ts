import { NextResponse } from 'next/server';
import { clearBreakGlassCookie } from '@/lib/auth/break-glass';
import { clearCrmSessionCookie, revokeCrmSession, CRM_SESSION_COOKIE } from '@/lib/auth/crm-session';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';

function logoutResponse(input: {
  cookieHeader: string | null;
  status: number;
  body: { ok: boolean; error?: string };
}) {
  const response = NextResponse.json(input.body, { status: input.status });

  // Expire every browser credential even when durable revocation is unavailable.
  clearCrmSessionCookie(response);
  clearBreakGlassCookie(response);
  clearSupabaseAuthCookies(response, input.cookieHeader);

  return response;
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie');

  const crmSessionCookie = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CRM_SESSION_COOKIE}=`))
    ?.slice(CRM_SESSION_COOKIE.length + 1);

  try {
    await revokeCrmSession(crmSessionCookie);
  } catch {
    return logoutResponse({
      cookieHeader,
      status: 503,
      body: { ok: false, error: 'Không thể thu hồi CRM session. Vui lòng thử lại.' },
    });
  }

  return logoutResponse({ cookieHeader, status: 200, body: { ok: true } });
}
