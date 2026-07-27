import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { clearBreakGlassCookie } from '@/lib/auth/break-glass';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearBreakGlassCookie(response);

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split(';')
            .map((c) => {
              const [name, ...rest] = c.trim().split('=');
              return { name, value: rest.join('=') };
            })
            .filter((c) => c.name) ?? [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    await supabase.auth.signOut();
  }

  return response;
}
