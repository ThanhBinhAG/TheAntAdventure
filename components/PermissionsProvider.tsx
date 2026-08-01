/**
 * File này cung cấp quyền của user cho toàn bộ giao diện CRM.
 *
 * Chức năng:
 * - Tải quyền một lần khi CRM được mount sau đăng nhập.
 * - Lưu quyền trong React Context để Sidebar, trang và nút thao tác dùng chung.
 * - Cung cấp can(permission) và refreshPermissions() cho các component con.
 * - Không tự cấp quyền: khi tải lỗi, danh sách quyền được để rỗng (an toàn).
 */

'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    hasPermission,
    type PermissionCode,
} from '@/lib/auth/permissions';
import { fetchCurrentPermissionCodes } from '@/lib/auth/permissions-client';

/** Dữ liệu và hành động mà component con có thể lấy qua usePermissions(). */
type PermissionsContextValue = {
    permissionCodes: ReadonlySet<string>;
    loading: boolean;
    error: string | null;
    can: (permission: PermissionCode) => boolean;
    loadPermissions: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/**
 * Bọc toàn bộ CRM để các component con cùng dùng một danh sách quyền.
 * Provider được đặt trong app/(crm)/layout.tsx, sau StoreProvider.
 */
export function PermissionsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    // Mặc định an toàn: chưa tải xong thì chưa có quyền nào.
    const [permissionCodes, setPermissionCodes] = useState<ReadonlySet<string>>(
        () => new Set(),
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Lấy toàn bộ quyền của user hiện đang đăng nhập.
    const loadPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const permissionCodes = await fetchCurrentPermissionCodes();

            // Dùng Set để kiểm tra quyền bằng .has() dễ dàng.
            setPermissionCodes(new Set(permissionCodes));
        } catch (error) {
            setPermissionCodes(new Set());
            setError(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải quyền người dùng.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Component vừa xuất hiện thì tải quyền lần đầu.
    useEffect(() => {
        void loadPermissions();
    }, [loadPermissions]);

    const value = useMemo<PermissionsContextValue>(
        () => ({
            permissionCodes,
            loading,
            error,
            can: (permission) => hasPermission(permissionCodes, permission),
            loadPermissions,
        }),
        [error, loading, permissionCodes, loadPermissions],
    );

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

/** Lấy quyền trong Sidebar, page gate hoặc các nút có điều kiện. */
export function usePermissions(): PermissionsContextValue {
    const context = useContext(PermissionsContext);

    if (!context) {
        throw new Error('usePermissions phải được dùng bên trong PermissionsProvider');
    }

    return context;
}
