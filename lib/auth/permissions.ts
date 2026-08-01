/**
 * File này là danh mục quyền dùng chung của CRM.
 *
 * Chức năng:
 * - Xác định quyền xem bắt buộc của mỗi URL/trang CRM.
 * - Cung cấp hàm kiểm tra một quyền cho Sidebar, trang và các nút thao tác.
 * - Không gọi database và không tự xác thực user; quyền thực tế được tải ở
 *   PermissionsProvider.
 */

import type { PageSlug } from '@/lib/types';

/** Mã quyền được lưu trong bảng public.permissions của Supabase. */
export type PermissionCode = string;

/**
 * Quyền tối thiểu để mở từng trang CRM.
 *
 * Đây chỉ là quyền "read" để xem trang. Quyền sửa/xuất/làm mới sẽ được kiểm
 * tra tại đúng nút thao tác và API tương ứng ở các bước tiếp theo.
 */
export const PAGE_READ_PERMISSION = {
  dashboard: 'dashboard.read',

  // Planner nằm trong Sales & Product; không dùng operations.read kẻo mở cả nhóm Operations.
  planner: 'sales.read',
  customers: 'customers.read',
  agents: 'agents.read',
  sales: 'sales.read',
  tourdesign: 'tour_design.read',

  products: 'catalogue.read',
  gallery: 'catalogue.read',
  attractions: 'catalogue.read',

  pricing: 'pricing.read',
  'pricing-essentials': 'pricing.read',
  'pricing-accommodation': 'pricing.read',

  weather: 'weather.read',

  bookings: 'operations.read',
  contracts: 'operations.read',
  suppliers: 'operations.read',
  guides: 'operations.read',
  posttour: 'operations.read',

  finance: 'finance.read',
  tax: 'finance.read',
  salary: 'hr.read',

  about: 'company.read',
  culture: 'company.read',
  regulations: 'company.read',
  hr: 'hr.read',

  // Database V1 chưa có ai.read, nên AI Requirements dùng cùng quyền Dev Notes.
  ai: 'devnotes.read',
  devnotes: 'devnotes.read',
  teamchat: 'teamchat.read',
} satisfies Record<PageSlug, PermissionCode>;

/**
 * Trả về true khi user có quyền cụ thể hoặc có wildcard (*) của super admin.
 * Hàm thuần này không phụ thuộc React/Supabase nên có thể dùng lại và unit test.
 */
export function hasPermission(
  permissionCodes: ReadonlySet<string>,
  requiredPermission: PermissionCode,
): boolean {
  return permissionCodes.has('*') || permissionCodes.has(requiredPermission);
}
