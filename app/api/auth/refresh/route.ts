import { NextResponse } from 'next/server';
import {
  clearCrmAccessCookies,
  CRM_SESSION_COOKIE,
  getCrmSession,
  refreshCrmSessionIfNeeded,
  setCrmAccessCookies,
} from '@/lib/auth/crm-session';

export async function POST(request: Request) {
  const cookieValue = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CRM_SESSION_COOKIE}=`))
    ?.slice(CRM_SESSION_COOKIE.length + 1);
  const stored = await getCrmSession(cookieValue);
  if (!stored) {
    const response = NextResponse.json({ ok: false, error: 'Chưa đăng nhập hoặc session đã hết hạn.' }, { status: 401 });
    clearCrmAccessCookies(response);
    return response;
  }

  const session = await refreshCrmSessionIfNeeded(stored);
  if (!session) {
    const response = NextResponse.json({ ok: false, error: 'Không thể làm mới session.' }, { status: 401 });
    clearCrmAccessCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  await setCrmAccessCookies(response, session);
  return response;
}
