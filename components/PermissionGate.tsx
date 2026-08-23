/**
 * File này chặn giao diện của trang CRM theo permission.
 *
 * Chức năng:
 * - Chờ PermissionsProvider tải quyền trước khi render trang.
 * - Không render component trang khi user thiếu quyền xem.
 * - Hiển thị empty-state CRM (loading / lỗi / không có quyền).
 *
 * Lưu ý:
 * - Đây là hàng rào giao diện và URL.
 * - API và RLS database sẽ được chặn riêng ở các bước tiếp theo.
 */

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import EmptyState from '@/components/EmptyState';
import { canReadPage } from '@/lib/auth/permissions';
import { usePermissions } from '@/components/PermissionsProvider';
import type { PageSlug } from '@/lib/types';

type PermissionGateProps = {
  page: PageSlug;
  children: ReactNode;
};

export function PermissionGate({ page, children }: PermissionGateProps) {
  const { loading, error, permissionCodes, loadPermissions } = usePermissions();

  if (loading) {
    return (
      <EmptyState
        className="crm-empty-state--table"
        variant="access"
        title="Checking access permission…"
        description="Please wait for a moment."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        className="crm-empty-state--table"
        variant="access"
        role="alert"
        title="Cannot check access permission"
        description="Please try again or login again to continue."
        action={
          <button type="button" className="btn btn-p" onClick={() => void loadPermissions()}>
            Try again
          </button>
        }
      />
    );
  }

  if (!canReadPage(permissionCodes, page)) {
    return (
      <EmptyState
        className="crm-empty-state--table"
        variant="access"
        role="alert"
        title="Access denied"
        description="Your account does not have permission to view this page. Please go back to the Dashboard or contact an administrator if you need access."
        action={
          <Link href="/dashboard" className="btn btn-p">
            Back to Dashboard
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
