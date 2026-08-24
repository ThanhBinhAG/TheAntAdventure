import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getServerSupabaseUrl,
  getServerSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { SUPABASE_ACCESS_COOKIE } from '@/lib/auth/supabase-cookie-names';
import { getCurrentAuthzState } from '@/lib/auth/authz-state';
import { verifySupabaseAccessToken } from '@/lib/auth/supabase-jwt';
import {
  getVerifiedSupabaseAccessToken,
  type AuthContext,
} from '@/lib/auth/session';
import { cookies } from 'next/headers';

function createUserScopedSupabaseClient(url: string, key: string, accessToken: string) {
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    accessToken: async () => accessToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Tạo user-scoped Supabase client trên server.
 * Access token do Supabase Auth phát, được BFF verify qua public JWKS.
 * Browser chỉ gửi cookie HttpOnly; không có token trong JavaScript/browser storage.
 */
export async function getServerSupabaseClient(verifiedContext?: AuthContext) {
  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase URL hoặc Anon Key chưa được cấu hình ở phía server.');
  }

  const inheritedAccessToken = verifiedContext
    ? getVerifiedSupabaseAccessToken(verifiedContext)
    : null;
  if (inheritedAccessToken) {
    return createUserScopedSupabaseClient(url, key, inheritedAccessToken);
  }

  const cookieStore = await cookies();
  const supabaseAccessToken = cookieStore.get(SUPABASE_ACCESS_COOKIE)?.value;
  const access = await verifySupabaseAccessToken(supabaseAccessToken);
  if (!access || !supabaseAccessToken) {
    throw new Error('Supabase session không hợp lệ hoặc đã hết hạn.');
  }
  const authz = await getCurrentAuthzState({
    userId: access.userId,
    accessToken: supabaseAccessToken,
  });
  if (!authz?.isActive) {
    throw new Error('Tài khoản CRM đã bị vô hiệu hóa.');
  }

  return createUserScopedSupabaseClient(url, key, supabaseAccessToken);
}

/**
 * Tạo admin-scoped Supabase client trên server.
 * Sử dụng service_role_key để thực hiện các đặc quyền hệ thống (bỏ qua RLS).
 * Không chuyển tiếp cookies của người dùng.
 */
export function getAdminSupabaseClient() {
  const url = getServerSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL hoặc Service Role Key chưa được cấu hình ở phía server.');
  }

  return createClient(url, serviceRoleKey, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
