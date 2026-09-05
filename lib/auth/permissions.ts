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
export type { PageSlug };

/** Mã quyền được lưu trong bảng public.permissions của Supabase. */
export type PermissionCode = string;

/**
 * Quyền xem bắt buộc của mỗi URL/trang CRM.
 */
export const PAGE_READ_PERMISSION: Record<PageSlug, PermissionCode> = {
  dashboard: 'dashboard.read',
  planner: 'planner.read',
  customers: 'customers.read',
  agents: 'agents.read',
  sales: 'sales.read',
  tourdesign: 'tour_design.read',
  products: 'products.read',
  gallery: 'gallery.read',
  attractions: 'attractions.read',
  pricing: 'pricing.read',
  'pricing-essentials': 'pricing_essentials.read',
  'pricing-accommodation': 'pricing_accommodation.read',
  weather: 'weather.read',
  bookings: 'bookings.read',
  contracts: 'contracts.read',
  suppliers: 'suppliers.read',
  guides: 'guides.read',
  posttour: 'posttour.read',
  finance: 'finance.read',
  tax: 'tax.read',
  salary: 'salary.read',
  about: 'about.read',
  culture: 'culture.read',
  regulations: 'regulations.read',
  hr: 'hr.read',
  ai: 'ai.read',
  devnotes: 'devnotes.read',
  teamchat: 'teamchat.read',
  'access-control': 'access_control.read',
  settings: 'settings.read',
};

/**
 * Quyền ghi (thêm/sửa/xóa) của mỗi URL/trang CRM.
 */
export const PAGE_WRITE_PERMISSION: Record<PageSlug, PermissionCode> = {
  dashboard: 'dashboard.write',
  planner: 'planner.write',
  customers: 'customers.write',
  agents: 'agents.write',
  sales: 'sales.write',
  tourdesign: 'tour_design.write',
  products: 'products.write',
  gallery: 'gallery.write',
  attractions: 'attractions.write',
  pricing: 'pricing.write',
  'pricing-essentials': 'pricing_essentials.write',
  'pricing-accommodation': 'pricing_accommodation.write',
  weather: 'weather.write',
  bookings: 'bookings.write',
  contracts: 'contracts.write',
  suppliers: 'suppliers.write',
  guides: 'guides.write',
  posttour: 'posttour.write',
  finance: 'finance.write',
  tax: 'tax.write',
  salary: 'salary.write',
  about: 'about.write',
  culture: 'culture.write',
  regulations: 'regulations.write',
  hr: 'hr.write',
  ai: 'ai.write',
  devnotes: 'devnotes.write',
  teamchat: 'teamchat.write',
  'access-control': 'access_control.write',
  settings: 'settings.write',
};

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

export function readPermissionForPage(page: PageSlug): PermissionCode {
  return PAGE_READ_PERMISSION[page];
}

export function writePermissionForPage(page: PageSlug): PermissionCode {
  return PAGE_WRITE_PERMISSION[page];
}

export function canReadPage(permissionCodes: ReadonlySet<string>, page: PageSlug): boolean {
  return hasPermission(permissionCodes, readPermissionForPage(page));
}

export function canWritePage(permissionCodes: ReadonlySet<string>, page: PageSlug): boolean {
  return hasPermission(permissionCodes, writePermissionForPage(page));
}
