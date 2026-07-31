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
    refreshPermissions: () => Promise<void>;
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

    /** Tải lại quyền, dùng sau khi admin vừa đổi role của user. */
    const refreshPermissions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const codes = await fetchCurrentPermissionCodes();
            setPermissionCodes(new Set(codes));
        } catch (cause) {
            // Không tải được quyền thì chặn giao diện thay vì cấp quyền mặc định.
            setPermissionCodes(new Set());
            setError(
                cause instanceof Error ? cause.message : 'Không thể tải quyền người dùng',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadInitialPermissions() {
            try {
                const codes = await fetchCurrentPermissionCodes();
                if (!cancelled) setPermissionCodes(new Set(codes));
            } catch (cause) {
                if (!cancelled) {
                    setPermissionCodes(new Set());
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : 'Không thể tải quyền người dùng',
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadInitialPermissions();
        return () => {
            cancelled = true;
        };
    }, []);

    const value = useMemo<PermissionsContextValue>(
        () => ({
            permissionCodes,
            loading,
            error,
            can: (permission) => hasPermission(permissionCodes, permission),
            refreshPermissions,
        }),
        [error, loading, permissionCodes, refreshPermissions],
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
