import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hasTrustedApiMutationOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    const configured = (
      process.env.APP_URL
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? request.nextUrl.origin
    ).trim();
    return origin === request.nextUrl.origin || origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const isAuthenticatedApiMutation = request.nextUrl.pathname.startsWith('/api/')
    && !SAFE_METHODS.has(request.method)
    && Boolean(request.headers.get('cookie'));

  if (isAuthenticatedApiMutation && !hasTrustedApiMutationOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Origin không hợp lệ.' }, { status: 403 });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
