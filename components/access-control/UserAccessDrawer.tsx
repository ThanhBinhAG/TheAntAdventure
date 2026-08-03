'use client';

/**
 * Drawer xem và thay đổi quyền của một người dùng.
 *
 * Chức năng:
 * - Hiển thị thông tin tài khoản đang chọn.
 * - Cho Super Admin chọn role mới.
 * - Hiển thị các permission hiệu lực của role được chọn.
 * - Gọi hàm onSave từ component cha để cập nhật role qua API.
 *
 * Lưu ý:
 * - File này chỉ hiển thị giao diện.
 * - Việc kiểm tra users.manage và cập nhật database diễn ra ở API/RPC.
 */

import {
    useMemo,
    useState,
} from 'react';
import {
    Alert,
    Button,
    Collapse,
    Descriptions,
    Drawer,
    Select,
    Tag,
} from 'antd';
import type {
    AccessControlPermission,
    AccessControlRole,
    AccessControlUser,
    ManagedRoleCode,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type UserAccessDrawerProps = {
    user: AccessControlUser | null;
    roles: AccessControlRole[];
    permissions: AccessControlPermission[];
    saving: boolean;
    onClose: () => void;
    onSave: (
        userId: string,
        roleCode: ManagedRoleCode,
    ) => Promise<void>;
};

/** Đổi tên nhóm kỹ thuật thành tên dễ hiểu trên giao diện. */
function getPermissionGroupLabel(permissionCode: string): string {
    const groupCode = permissionCode.split('.')[0];

    const labels: Record<string, string> = {
        dashboard: 'Bảng điều hành',
        customers: 'Khách hàng',
        sales: 'Bán hàng',
        pricing: 'Báo giá',
        products: 'Sản phẩm',
        gallery: 'Thư viện ảnh',
        planner: 'Kế hoạch',
        weather: 'Thời tiết',
        teamchat: 'Team chat',
        users: 'Quản lý người dùng',
    };

    return labels[groupCode] ?? 'Chức năng khác';
}

/** Đổi role kỹ thuật thành nhãn hiển thị. */
function getRoleLabel(roleCode: ManagedRoleCode): string {
    if (roleCode === 'super_admin') return 'Super Admin';
    if (roleCode === 'admin') return 'Admin';

    return 'Nhân viên';
}

export default function UserAccessDrawer({
    user,
    roles,
    permissions,
    saving,
    onClose,
    onSave,
}: UserAccessDrawerProps) {
    const [selectedRole, setSelectedRole] =
        useState<ManagedRoleCode>(
            () => user?.role_code ?? 'employee',
        );

    // UserDirectory truyền key theo user_id, nên Drawer được tạo lại khi đổi user.
    // Vì vậy state trên luôn bắt đầu từ role hiện tại, không cần useEffect.

    /** Lấy thông tin đầy đủ của role đang chọn. */
    const selectedRoleInfo = useMemo(() => {
        return roles.find(
            (role) => role.role_code === selectedRole,
        );
    }, [roles, selectedRole]);

    /** Super Admin có wildcard (*) nên không cần liệt kê từng quyền. */
    const isSuperAdmin =
        selectedRole === 'super_admin' ||
        selectedRoleInfo?.permission_codes.includes('*');

    /** Gom permission theo nhóm để Drawer dễ đọc hơn. */
    const permissionGroups = useMemo(() => {
        if (isSuperAdmin || !selectedRoleInfo) {
            return [];
        }

        const descriptionByCode = new Map(
            permissions.map((permission) => [
                permission.permission_code,
                permission.permission_description,
            ]),
        );

        const groups = new Map<string, string[]>();

        for (const permissionCode of selectedRoleInfo.permission_codes) {
            const groupName = getPermissionGroupLabel(permissionCode);
            const currentGroup = groups.get(groupName) ?? [];

            currentGroup.push(permissionCode);
            groups.set(groupName, currentGroup);
        }

        return Array.from(groups.entries()).map(
            ([groupName, permissionCodes]) => ({
                key: groupName,
                label: `${groupName} (${permissionCodes.length} quyền)`,
                children: (
                    <div className={styles.effectivePermissionList}>
                        {permissionCodes.map((permissionCode) => (
                            <div
                                key={permissionCode}
                                className={styles.effectivePermissionItem}
                            >
                                <strong>
                                    {descriptionByCode.get(permissionCode) ??
                                        permissionCode}
                                </strong>

                                <code>{permissionCode}</code>
                            </div>
                        ))}
                    </div>
                ),
            }),
        );
    }, [isSuperAdmin, permissions, selectedRoleInfo]);

    async function handleSave() {
        if (!user) return;

        await onSave(user.user_id, selectedRole);
    }

    return (
        <Drawer
            title="Phân quyền người dùng"
            open={Boolean(user)}
            width={560}
            onClose={onClose}
            destroyOnHidden
        >
            {user && (
                <div className={styles.userAccessDrawer}>
                    <Descriptions
                        bordered
                        column={1}
                        size="small"
                    >
                        <Descriptions.Item label="Người dùng">
                            {user.display_name || 'Chưa đặt tên'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Email">
                            {user.email || 'Chưa có email'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Trạng thái">
                            <Tag color={user.is_active ? 'green' : 'red'}>
                                {user.is_active
                                    ? 'Hoạt động'
                                    : 'Đã khóa'}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    <div className={styles.drawerField}>
                        <label htmlFor="user-role-select">
                            Role của người dùng
                        </label>

                        <Select
                            id="user-role-select"
                            value={selectedRole}
                            disabled={saving}
                            onChange={setSelectedRole}
                            options={roles.map((role) => ({
                                value: role.role_code,
                                label: getRoleLabel(role.role_code),
                            }))}
                        />

                        <p>
                            {selectedRoleInfo?.role_description ??
                                'Role chưa có mô tả.'}
                        </p>
                    </div>

                    {isSuperAdmin ? (
                        <Alert
                            type="warning"
                            showIcon
                            message="Super Admin có toàn quyền hệ thống"
                            description="Role này dùng permission wildcard (*), vì vậy có thể truy cập và quản lý toàn bộ chức năng."
                        />
                    ) : (
                        <section className={styles.effectivePermissions}>
                            <div>
                                <h3>Quyền hiệu lực sau khi lưu</h3>

                                <p>
                                    Role này có{' '}
                                    <strong>
                                        {selectedRoleInfo?.permission_codes.length ??
                                            0}
                                    </strong>{' '}
                                    quyền.
                                </p>
                            </div>

                            <Collapse
                                items={permissionGroups}
                                defaultActiveKey={
                                    permissionGroups[0]?.key
                                }
                            />
                        </section>
                    )}

                    <div className={styles.drawerActions}>
                        <Button onClick={onClose} disabled={saving}>
                            Hủy
                        </Button>

                        <Button
                            type="primary"
                            loading={saving}
                            onClick={() => void handleSave()}
                        >
                            Lưu role
                        </Button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
