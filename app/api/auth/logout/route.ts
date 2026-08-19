import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { clearBreakGlassCookie } from '@/lib/auth/break-glass';
import { clearSupabaseAuthCookies } from '@/lib/auth/cookie-hygiene';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const cookieHeader = request.headers.get('cookie');

  clearBreakGlassCookie(response);
  // Explicitly expire every sb-*-auth-token(.N) before/after signOut so nginx
  // never keeps receiving stale chunk cookies after logout.
  clearSupabaseAuthCookies(response, cookieHeader);

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (url && key) {
    const supabase = createServerClient(url, key, {
      ...getSupabaseGlobalFetchOptions(),
      cookies: {
        getAll() {
          return (
            cookieHeader
              ?.split(';')
              .map((c) => {
                const [name, ...rest] = c.trim().split('=');
                return { name, value: rest.join('=') };
              })
              .filter((c) => c.name) ?? []
          );
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    // Gọi signOut ngầm để không chặn phản hồi đăng xuất trả về trình duyệt
    void supabase.auth.signOut();
  }

  return response;
}
