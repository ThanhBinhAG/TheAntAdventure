import { NextResponse } from 'next/server';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import { getClientIp } from '@/lib/auth/rate-limit';
import { recordAuthSecurityEvent } from '@/lib/auth/security-audit';
import {
  clearLegacyCrmAuthCookies,
  clearSupabaseAccessCookie,
  createSupabaseRouteClient,
} from '@/lib/auth/supabase-ssr';

function clearBrowserCredentials(response: NextResponse, cookieHeader: string | null): void {
  clearSupabaseAccessCookie(response);
  clearLegacyCrmAuthCookies(response);
  clearSupabaseAuthCookies(response, cookieHeader);
}

function copyCookies(source: NextResponse, target: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const ip = getClientIp(request);
  const response = NextResponse.json({ ok: true });

  try {
    const supabase = createSupabaseRouteClient(request, response);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch {
    clearBrowserCredentials(response, cookieHeader);
    const failure = NextResponse.json(
      { ok: false, error: 'Không thể thu hồi Supabase session. Vui lòng thử lại.' },
      { status: 503 },
    );
    copyCookies(response, failure);
    void recordAuthSecurityEvent({ eventType: 'logout_failed', ip });
    return failure;
  }

  clearBrowserCredentials(response, cookieHeader);
  void recordAuthSecurityEvent({ eventType: 'logout_succeeded', ip });
  return response;
}
