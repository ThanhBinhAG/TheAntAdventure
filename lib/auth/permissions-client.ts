/**
 * File này tải quyền từ trình duyệt.
 *
 * Chức năng:
 * - Gọi API nội bộ /api/auth/permissions cùng cookie session hiện tại.
 * - Chuẩn hóa phản hồi thành mảng mã quyền cho PermissionsProvider.
 * - Không gọi Supabase RPC trực tiếp để break-glass cũng hoạt động đúng.
 */

'use client';

import type { PermissionCode } from '@/lib/auth/permissions';

/** Cấu trúc JSON do API /api/auth/permissions trả về. */
type PermissionResponse = {
  ok?: boolean;
  permissions?: PermissionCode[];
  error?: string;
};

/**
 * Lấy quyền của session đang đăng nhập.
 * Ném lỗi để Provider hiển thị trạng thái lỗi thay vì âm thầm cấp quyền rỗng.
 */
export async function fetchCurrentPermissionCodes(): Promise<PermissionCode[]> {
  const response = await fetch('/api/auth/permissions', {
    method: 'GET',
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => ({}))) as PermissionResponse;

  if (!response.ok || !body.ok) {
    throw new Error(body.error || 'Không thể tải quyền người dùng');
  }

  return body.permissions ?? [];
}
