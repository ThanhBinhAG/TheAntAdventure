import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  getServerSupabaseUrl,
  getServerSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import {
  CRM_ACCESS_COOKIE,
  CRM_SESSION_COOKIE,
  CRM_SUPABASE_ACCESS_COOKIE,
  getCrmSession,
  getCrmSessionRevocationStatus,
  refreshCrmSessionIfNeeded,
} from '@/lib/auth/crm-session';
import { verifyCrmAccessToken } from '@/lib/auth/crm-access-token';
import { cookies } from 'next/headers';

/**
 * Tạo user-scoped Supabase client trên server.
 * Access token Supabase chỉ được lấy từ Redis sau khi CRM session đã xác thực.
 * Browser không nhận hoặc gửi Supabase Auth cookie.
 */
export async function getServerSupabaseClient() {
  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase URL hoặc Anon Key chưa được cấu hình ở phía server.');
  }

  const cookieStore = await cookies();
  const supabaseAccessToken = cookieStore.get(CRM_SUPABASE_ACCESS_COOKIE)?.value;
  const access = await verifyCrmAccessToken(
    cookieStore.get(CRM_ACCESS_COOKIE)?.value,
    supabaseAccessToken,
  );
  if (access) {
    const revocation = await getCrmSessionRevocationStatus(access.sid);
    if (revocation === 'active' && supabaseAccessToken) {
      return createClient(url, key, {
        ...getSupabaseGlobalFetchOptions(),
        accessToken: async () => supabaseAccessToken,
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    if (revocation === 'revoked') {
      throw new Error('CRM session không hợp lệ hoặc đã hết hạn.');
    }
    // Redis outage: verify against durable storage below before using a token.
  }
  const storedSession = await getCrmSession(cookieStore.get(CRM_SESSION_COOKIE)?.value);
  const session = storedSession && await refreshCrmSessionIfNeeded(storedSession);
  if (!session) throw new Error('CRM session không hợp lệ hoặc đã hết hạn.');

  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    accessToken: async () => session.supabaseAccessToken,
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
