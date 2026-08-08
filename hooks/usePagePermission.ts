'use client';

import { useMemo } from 'react';
import { usePermissions } from '@/components/PermissionsProvider';
import {
    canReadPage,
    canWritePage,
    type PageSlug,
} from '@/lib/auth/permissions';

export type PagePermissions = {
    canRead: boolean;
    canWrite: boolean;
    loading: boolean;
};

/**
 * Hook giúp các trang và UI component kiểm tra quyền Xem (`canRead`) và Sửa (`canWrite`)
 * cho từng trang/feature của sidebar.
 *
 * @param page Slug của trang (ví dụ: 'bookings', 'customers', 'sales', 'tourdesign')
 */
export function usePagePermission(page: PageSlug): PagePermissions {
    const { permissionCodes, loading } = usePermissions();

    const canRead = useMemo(
        () => canReadPage(permissionCodes, page),
        [permissionCodes, page],
    );

    const canWrite = useMemo(
        () => canWritePage(permissionCodes, page),
        [permissionCodes, page],
    );

    return {
        canRead,
        canWrite,
        loading,
    };
}
