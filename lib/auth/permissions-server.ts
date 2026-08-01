/**
 * File này lấy quyền hiệu lực của session ở phía server.
 *
 * Chức năng:
 * - Đọc cookie Supabase an toàn trên server và gọi RPC current_permission_codes().
 * - Chỉ trả mã quyền; không trả profile, role hay thông tin nhạy cảm khác.
 * - Bảo toàn cơ chế break-glass hiện có bằng cách cấp wildcard (*) cho session đó.
 */

import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAuthContext } from '@/lib/auth/session';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import {
  hasPermission,
  type PermissionCode,
} from '@/lib/auth/permissions';

/** Kiểu một dòng do RPC current_permission_codes() trả về. */
type PermissionRow = { code: string };

/**
 * Lấy danh sách quyền của request hiện tại.
 *
 * Trả về null nếu chưa đăng nhập; trả về [] nếu user đăng nhập nhưng chưa được
 * gán role hoặc role đó không có quyền nào.
 */
export async function getCurrentPermissionCodesForRequest(): Promise<
  PermissionCode[] | null
> {
  const auth = await getAuthContext();

  if (!auth.authenticated) return null;

  // Session break-glass là đường khôi phục khẩn cấp, luôn có toàn quyền.
  if (auth.isBreakGlass && auth.isSuperAdmin) return ['*'];

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error('Supabase URL hoặc anon key chưa được cấu hình');
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      // Chuyển cookie hiện tại vào Supabase để RPC biết auth.uid() là ai.
      getAll() {
        return cookieStore.getAll();
      },
      // Route này chỉ đọc quyền, không cần ghi/refresh cookie.
      setAll() { },
    },
  });

  const { data, error } = await supabase.rpc('current_permission_codes');
  if (error) throw new Error(error.message);

  return ((data ?? []) as PermissionRow[])
    .map((row) => row.code)
    .filter((code): code is PermissionCode => Boolean(code));
}

/**
 * Kết quả kiểm tra quyền cho một request API.
 *
 * - allowed: true  → API có thể tiếp tục xử lý.
 * - status: 401    → chưa đăng nhập hoặc session đã hết hạn.
 * - status: 403    → đã đăng nhập nhưng role không có quyền yêu cầu.
 */
export type RequestPermissionResult =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 };

/**
 * Kiểm tra một permission của session hiện tại ở phía server.
 *
 * Hàm này được dùng bởi các API có thao tác nhạy cảm như:
 * upload/xóa ảnh, xuất PDF, làm mới weather.
 *
 * Không kiểm tra role admin/employee trực tiếp; chỉ kiểm tra permission.
 * Vì vậy sau này thêm role mới thì các API này không cần sửa.
 */

export async function checkPermissionForRequest(
  requiredPermission: PermissionCode,
): Promise<RequestPermissionResult> {
  const permissionCodes = await getCurrentPermissionCodesForRequest();

  // Không có session hợp lệ.
  if (permissionCodes == null) {
    return { allowed: false, status: 401 };
  }

  // Có session nhưng không có permission cần thiết.
  if (!hasPermission(new Set(permissionCodes), requiredPermission)) {
    return { allowed: false, status: 403 };
  }

  return { allowed: true };
}
