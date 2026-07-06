import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl, getWeatherCronSecret } from '@/lib/env';

export async function isRefreshAuthorized(request: Request): Promise<boolean> {
  const secret = getWeatherCronSecret();
  const auth = request.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return true;

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return false;

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only check */
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return Boolean(data.user);
}
