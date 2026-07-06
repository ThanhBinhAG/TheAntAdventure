import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

export async function isProposalExportAuthorized(): Promise<boolean> {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return process.env.NODE_ENV === 'development';

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
