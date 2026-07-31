// import 'server-only';
// import { getAuthContext } from '@/lib/auth/session';

// /** Proposal / pricing PDF export — authenticated session only (no env-based bypass). */
// export async function isProposalExportAuthorized(): Promise<boolean> {
//   const ctx = await getAuthContext();
//   return ctx.authenticated;
// }

/**
 * File này kiểm tra quyền xuất PDF của phần thiết kế tour/proposal.
 *
 * Chức năng:
 * - Không tự kiểm tra role admin/employee.
 * - Dùng hệ thống permission tập trung.
 * - Chỉ người có quyền `tour_design.export` mới được xuất proposal PDF.
 */
import 'server-only';

import {
  checkPermissionForRequest,
  type RequestPermissionResult,
} from '@/lib/auth/permissions-server';

export async function checkProposalExportPermission(): Promise<RequestPermissionResult> {
  return checkPermissionForRequest('tour_design.export');
}