/**
 * File này chặn giao diện của trang CRM theo permission.
 *
 * Chức năng:
 * - Chờ PermissionsProvider tải quyền trước khi render trang.
 * - Không render component trang khi user thiếu quyền xem.
 * - Hiển thị thông báo, nút thử lại hoặc quay về Dashboard.
 *
 * Lưu ý:
 * - Đây là hàng rào giao diện và URL.
 * - API và RLS database sẽ được chặn riêng ở các bước tiếp theo.
 */

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { canReadPage } from '@/lib/auth/permissions';
import { usePermissions } from '@/components/PermissionsProvider';
import type { PageSlug } from '@/lib/types';

type PermissionGateProps = {
    page: PageSlug;
    children: ReactNode;
};

export function PermissionGate({
    page,
    children,
}: PermissionGateProps) {
    const {
        loading,
        error,
        permissionCodes,
        loadPermissions,
    } = usePermissions();

    // Không render trang trước khi biết chính xác user có quyền hay không.
    if (loading) {
        return (
            <section
                className="card"
                role="status"
                aria-live="polite"
            >
                <div className="card-body">
                    Checking access permissions…
                </div>
            </section>
        );
    }

    // Không hiển thị lỗi kỹ thuật chi tiết ra giao diện.
    if (error) {
        return (
            <section className="card" role="alert">
                <div className="card-hd">
                    <strong>Không thể kiểm tra quyền truy cập</strong>
                </div>
                <div className="card-body">
                    <p>Vui lòng thử lại hoặc đăng nhập lại.</p>
                    <button
                        type="button"
                        className="btn btn-p"
                        onClick={() => void loadPermissions()}
                    >
                        Thử lại
                    </button>
                </div>
            </section>
        );
    }

    // User thiếu quyền thì không mount nội dung trang.
    if (!canReadPage(permissionCodes, page)) {
        return (
            <section className="card" role="alert">
                <div className="card-hd">
                    <strong>Không có quyền truy cập</strong>
                </div>
                <div className="card-body">
                    <p>Bạn không có quyền xem mục này.</p>
                    <Link href="/dashboard" className="btn btn-p">
                        Về Dashboard
                    </Link>
                </div>
            </section>
        );
    }
    return <>{children}</>;
}