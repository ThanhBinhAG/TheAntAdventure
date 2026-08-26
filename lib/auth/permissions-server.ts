/**
 * File này lấy quyền hiệu lực của session ở phía server.
 *
 * Chức năng:
 * - Đọc cookie Supabase an toàn trên server và gọi RPC current_permission_codes().
 * - Chỉ trả mã quyền; không trả profile, role hay thông tin nhạy cảm khác.
 * - Bảo toàn cơ chế break-glass hiện có bằng cách cấp wildcard (*) cho session đó.
 */

import 'server-only';

import { getAuthContext, type AuthContext } from '@/lib/auth/session';
import { maskEmailForDisplay } from '@/lib/auth/mask-email';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCachedPermissionCodes,
  setCachedPermissionCodes,
} from '@/lib/redis/permissions';
import {
  hasPermission,
  type PermissionCode,
} from '@/lib/auth/permissions';

export type CRMLayoutBoot = {
  permissionCodes: PermissionCode[];
  /** Server-masked identity for topbar; never the raw email. */
  sessionEmailMasked: string | null;
};


/** Kiểu một dòng do RPC current_permission_codes() trả về. */
type PermissionRow = { code: string };

export type PermissionRequestContext = {
  auth: AuthContext;
  getSupabaseClient: () => Promise<SupabaseClient>;
};

/**
 * Gọi RPC để lấy permission từ cookie session hiện tại.
 *
 * Hàm này chỉ đọc quyền; RPC current_permission_codes() tự kiểm tra:
 * - auth.uid()
 * - tài khoản còn hoạt động
 * - tài khoản chưa bị xóa mềm
 */
async function readPermissionCodesFromSupabase(
  getSupabaseClient: () => Promise<SupabaseClient> = getServerSupabaseClient,
): Promise<PermissionCode[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.rpc('current_permission_codes');

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PermissionRow[])
    .map((row) => row.code)
    .filter((code): code is PermissionCode => Boolean(code));
}

async function readPermissionCodesWithCache(
  userId: string,
  getSupabaseClient?: () => Promise<SupabaseClient>,
): Promise<PermissionCode[]> {
  const cached = await getCachedPermissionCodes(userId);

  if (cached.permissionCodes !== undefined) {
    return cached.permissionCodes;
  }

  const permissionCodes = await readPermissionCodesFromSupabase(getSupabaseClient);

  await setCachedPermissionCodes(
    userId,
    cached.version,
    permissionCodes,
  );

  return permissionCodes;
}


/**
 * Dùng riêng cho app/(crm)/layout.tsx.
 *
 * Một lần getAuthContext(): quyền + email đã che cho Topbar.
 * Middleware đã xác thực user trước đó; session không hợp lệ → permissions [].
 *
 * Không dùng hàm này cho API, vì API cần phân biệt lỗi 401 và 403.
 */
export async function getCRMLayoutBoot(): Promise<CRMLayoutBoot> {
  const auth = await getAuthContext();

  if (!auth.authenticated) {
    return { permissionCodes: [], sessionEmailMasked: null };
  }

  const sessionEmailMasked = maskEmailForDisplay(auth.email);

  if (auth.isBreakGlass && auth.isSuperAdmin) {
    return { permissionCodes: ['*'], sessionEmailMasked };
  }

  const permissionCodes = await readPermissionCodesFromSupabase(() =>
    getServerSupabaseClient(auth),
  );
  return { permissionCodes, sessionEmailMasked };
}

/** Prefer getCRMLayoutBoot() when the layout also needs the masked welcome identity. */
export async function getInitialPermissionCodesForCRMLayout(): Promise<
  PermissionCode[]
> {
  const boot = await getCRMLayoutBoot();
  return boot.permissionCodes;
}

/**
 * Lấy danh sách quyền của request hiện tại.
 *
 * Trả về null nếu chưa đăng nhập; trả về [] nếu user đăng nhập nhưng chưa được
 * gán role hoặc role đó không có quyền nào.
 */
export async function getCurrentPermissionCodesForRequest(): Promise<
  PermissionCode[] | null
>;
export async function getCurrentPermissionCodesForRequest(
  context: PermissionRequestContext,
): Promise<PermissionCode[] | null>;
export async function getCurrentPermissionCodesForRequest(
  context?: PermissionRequestContext,
): Promise<PermissionCode[] | null> {
  const auth = context?.auth ?? await getAuthContext();

  if (!auth.authenticated) return null;

  // Session break-glass là đường khôi phục khẩn cấp, luôn có toàn quyền.
  if (auth.isBreakGlass && auth.isSuperAdmin) return ['*'];

  // The JWT/profile state above is already verified. Reuse its private
  // request-local token when an explicit BFF client was not supplied.
  return readPermissionCodesWithCache(
    auth.userId!,
    context?.getSupabaseClient ?? (() => getServerSupabaseClient(auth)),
  );
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
  context?: PermissionRequestContext,
): Promise<RequestPermissionResult> {
  const permissionCodes = context
    ? await getCurrentPermissionCodesForRequest(context)
    : await getCurrentPermissionCodesForRequest();

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
