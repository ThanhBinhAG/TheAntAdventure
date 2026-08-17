'use client';

import React from 'react';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { PageSlug } from '@/lib/auth/permissions';

type WriteGateProps = {
    page: PageSlug;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    /**
     * Nếu mode = 'hide' (mặc định), khi không có quyền write sẽ ẩn hoàn toàn (render fallback hoặc null).
     * Nếu mode = 'disable', khi không có quyền write sẽ truyền prop `disabled: true` vào component con.
     */
    mode?: 'hide' | 'disable';
};

/**
 * Component bọc các nút bấm / form thao tác dữ liệu.
 * Chỉ cho phép hiển thị hoặc tương tác khi người dùng có quyền `.write` của trang.
 */
export function WriteGate({
    page,
    children,
    fallback = null,
    mode = 'hide',
}: WriteGateProps) {
    const { canWrite } = usePagePermission(page);

    if (canWrite) {
        return <>{children}</>;
    }

    if (mode === 'disable' && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<{ disabled?: boolean }>, {
            disabled: true,
        });
    }

    return <>{fallback}</>;
}
