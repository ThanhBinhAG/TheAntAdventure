import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  getServerSupabaseUrl,
  getServerSupabaseAnonKey,
  getSupabaseServiceRoleKey,
} from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

/**
 * Tạo user-scoped Supabase client trên server.
 * Tự động chuyển tiếp cookies để kế thừa quyền (RLS) của user hiện tại.
 */
export async function getServerSupabaseClient() {
  const url = getServerSupabaseUrl();
  const key = getServerSupabaseAnonKey();

  if (!url || !key) {
    throw new Error('Supabase URL hoặc Anon Key chưa được cấu hình ở phía server.');
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Bỏ qua lỗi nếu hàm được gọi từ Server Component (chỉ đọc)
        }
      },
    },
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

  return createServerClient(url, serviceRoleKey, {
    ...getSupabaseGlobalFetchOptions(),
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Admin client không thiết lập cookies của người dùng
      },
    },
  });
}
