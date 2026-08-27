import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import {
  getAuthContext,
  getVerifiedSupabaseAccessToken,
  type AuthContext,
} from '@/lib/auth/session';

function createUserScopedSupabaseClient(url: string, key: string, accessToken: string) {
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    accessToken: async () => accessToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Tạo user-scoped Supabase client trên server.
 * Access token do Supabase Auth phát được lấy từ CRM durable session đã xác
 * thực. Browser chỉ gửi opaque HttpOnly `crm_session`; không có token Supabase
 * trong cookie, JavaScript, hoặc browser storage.
 */
export async function getServerSupabaseClient(verifiedContext?: AuthContext) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase URL hoặc Anon Key chưa được cấu hình ở phía server.');
  }

  const context = verifiedContext ?? await getAuthContext();
  const inheritedAccessToken = context.authenticated
    ? getVerifiedSupabaseAccessToken(context)
    : null;
  if (inheritedAccessToken) {
    return createUserScopedSupabaseClient(url, key, inheritedAccessToken);
  }
  throw new Error('CRM session không hợp lệ hoặc đã hết hạn.');
}

/**
 * Tạo admin-scoped Supabase client trên server.
 * Sử dụng service_role_key để thực hiện các đặc quyền hệ thống (bỏ qua RLS).
 * Không chuyển tiếp cookies của người dùng.
 */
export function getAdminSupabaseClient() {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL hoặc Service Role Key chưa được cấu hình ở phía server.');
  }

  return createClient(url, serviceRoleKey, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
