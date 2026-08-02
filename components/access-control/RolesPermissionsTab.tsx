'use client';

/**
 * Tab cấu hình role và permission.
 *
 * Chức năng:
 * - Chọn role ở cột bên trái.
 * - Xem và chỉnh permission của Admin hoặc Nhân viên ở cột bên phải.
 * - Chọn hoặc bỏ chọn toàn bộ quyền trong một nhóm chức năng.
 * - Lưu permission mới qua API hiện có.
 *
 * Lưu ý:
 * - Super Admin dùng permission wildcard (*) nên chỉ xem, không chỉnh.
 * - API và database RPC vẫn là nơi kiểm tra quyền users.manage.
 */

import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    LockOutlined,
    SafetyCertificateOutlined,
    SaveOutlined,
    TeamOutlined,
    UserSwitchOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Empty,
    Skeleton,
    Tag,
} from 'antd';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type {
    AccessControlPermission,
    AccessControlRole,
    EditableRoleCode,
    ManagedRoleCode,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type RolesPermissionsTabProps = {
    roles: AccessControlRole[];
    permissions: AccessControlPermission[];
    loading: boolean;
    error: string | null;
    onRetry: () => Promise<void>;
    onRoleChanged: () => Promise<void>;
    onUpdatePermissions: (
        roleCode: EditableRoleCode,
        permissionCodes: string[],
    ) => Promise<void>;
};

/** Nhãn hiển thị cho từng role. */
const ROLE_LABELS: Record<ManagedRoleCode, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    employee: 'Nhân viên',
};

/** Mô tả ngắn để người quản trị dễ hiểu ý nghĩa mỗi role. */
const ROLE_DESCRIPTIONS: Record<ManagedRoleCode, string> = {
    super_admin: 'Toàn quyền hệ thống và quản lý người dùng.',
    admin: 'Quản lý nghiệp vụ và cấu hình quyền cho nhân viên.',
    employee: 'Thực hiện công việc nghiệp vụ được cấp quyền.',
};

/** Nhãn tiếng Việt cho từng nhóm permission. */
const GROUP_LABELS: Record<string, string> = {
    dashboard: 'Bảng điều hành',
    customers: 'Khách hàng',
    agents: 'Đại lý B2B',
    sales: 'Bán hàng',
    tour_design: 'Thiết kế tour',
    catalogue: 'Sản phẩm và thư viện ảnh',
    pricing: 'Bảng giá',
    operations: 'Vận hành',
    finance: 'Tài chính',
    hr: 'Nhân sự',
    company: 'Thông tin công ty',
    weather: 'Thời tiết',
    teamchat: 'Chat nội bộ',
    devnotes: 'Ghi chú kỹ thuật',
};

/** Gom permission theo phần đứng trước dấu chấm, ví dụ sales.read. */
function groupPermissions(
    permissions: AccessControlPermission[],
) {
    const groups = new Map<string, AccessControlPermission[]>();

    for (const permission of permissions) {
        const groupCode = permission.permission_code.split('.')[0];
        const items = groups.get(groupCode) ?? [];

        items.push(permission);
        groups.set(groupCode, items);
    }

    return Array.from(groups.entries())
        .map(([groupCode, items]) => ({
            groupCode,
            label: GROUP_LABELS[groupCode] ?? groupCode,
            items,
        }))
        .sort((first, second) =>
            first.label.localeCompare(second.label, 'vi'),
        );
}

/** So sánh hai danh sách quyền mà không quan tâm thứ tự. */
function hasSamePermissions(
    first: string[],
    second: string[],
): boolean {
    if (first.length !== second.length) return false;

    const firstSet = new Set(first);

    return second.every((code) => firstSet.has(code));
}

export default function RolesPermissionsTab({
    roles,
    permissions,
    loading,
    error,
    onRetry,
    onRoleChanged,
    onUpdatePermissions,
}: RolesPermissionsTabProps) {
    const [selectedRole, setSelectedRole] =
        useState<ManagedRoleCode>('employee');
    const [selectedPermissionCodes, setSelectedPermissionCodes] =
        useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    /** Role hiện đang được chọn trên giao diện. */
    const activeRole = useMemo(() => {
        return roles.find(
            (role) => role.role_code === selectedRole,
        );
    }, [roles, selectedRole]);

    /** Danh sách nhóm permission hiển thị ở cột phải. */
    const permissionGroups = useMemo(() => {
        return groupPermissions(permissions);
    }, [permissions]);

    // Khi đổi role hoặc tải lại dữ liệu, lấy quyền hiện tại từ database.
    useEffect(() => {
        if (selectedRole === 'super_admin') return;

        setSelectedPermissionCodes(
            activeRole?.permission_codes ?? [],
        );
    }, [activeRole, selectedRole]);

    const hasChanges = !hasSamePermissions(
        selectedPermissionCodes,
        activeRole?.permission_codes ?? [],
    );

    /** Bật hoặc tắt một permission đơn lẻ. */
    function togglePermission(
        permissionCode: string,
        checked: boolean,
    ) {
        setSelectedPermissionCodes((current) => {
            if (checked) {
                return [...new Set([...current, permissionCode])];
            }

            return current.filter(
                (code) => code !== permissionCode,
            );
        });
    }

    /** Bật hoặc tắt toàn bộ quyền trong một nhóm chức năng. */
    function togglePermissionGroup(
        permissionCodes: string[],
        checked: boolean,
    ) {
        setSelectedPermissionCodes((current) => {
            if (checked) {
                return [...new Set([...current, ...permissionCodes])];
            }

            return current.filter(
                (code) => !permissionCodes.includes(code),
            );
        });
    }

    /** Lưu danh sách permission mới cho Admin hoặc Nhân viên. */
    async function handleSave() {
        if (
            selectedRole === 'super_admin' ||
            !hasChanges
        ) {
            return;
        }

        const confirmed = await confirmDialog(
            `Bạn sắp cập nhật ${selectedPermissionCodes.length} quyền cho role ${ROLE_LABELS[selectedRole]}.`,
            {
                title: 'Xác nhận cập nhật quyền',
                confirmLabel: 'Lưu quyền',
                cancelLabel: 'Hủy',
                danger: false,
            },
        );

        if (!confirmed) return;

        setSaving(true);

        try {
            await onUpdatePermissions(
                selectedRole,
                selectedPermissionCodes,
            );

            toast.success('Đã cập nhật permission của role.');
            await onRoleChanged();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật permission.',
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <Skeleton active paragraph={{ rows: 12 }} />;
    }

    if (error) {
        return (
            <div className={styles.errorState}>
                <p>{error}</p>

                <Button
                    type="primary"
                    onClick={() => void onRetry()}
                >
                    Thử lại
                </Button>
            </div>
        );
    }

    if (!activeRole) {
        return <Empty description="Không tìm thấy dữ liệu role." />;
    }

    return (
        <div className={styles.rolesWorkspace}>
            <aside className={styles.roleList}>
                <div>
                    <h2 className={styles.sectionTitle}>Role</h2>

                    <p className={styles.sectionDescription}>
                        Chọn role cần xem hoặc cấu hình quyền.
                    </p>
                </div>

                {(['super_admin', 'admin', 'employee'] as const).map(
                    (roleCode) => {
                        const role = roles.find(
                            (item) => item.role_code === roleCode,
                        );

                        const permissionCount =
                            roleCode === 'super_admin'
                                ? 'Toàn quyền'
                                : `${role?.permission_codes.length ?? 0} quyền`;

                        const Icon =
                            roleCode === 'super_admin'
                                ? SafetyCertificateOutlined
                                : roleCode === 'admin'
                                    ? UserSwitchOutlined
                                    : TeamOutlined;

                        return (
                            <button
                                key={roleCode}
                                type="button"
                                aria-pressed={
                                    selectedRole === roleCode
                                }
                                className={`${styles.roleChoice} ${selectedRole === roleCode
                                        ? styles.roleChoiceActive
                                        : ''
                                    }`}
                                onClick={() => {
                                    setSelectedRole(roleCode);
                                }}
                            >
                                <Icon />

                                <span>
                                    <strong>
                                        {ROLE_LABELS[roleCode]}
                                    </strong>

                                    <small>
                                        {ROLE_DESCRIPTIONS[roleCode]}
                                    </small>
                                </span>

                                <em>{permissionCount}</em>
                            </button>
                        );
                    },
                )}
            </aside>

            <section className={styles.permissionWorkspace}>
                <header className={styles.permissionWorkspaceHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            Quyền của {ROLE_LABELS[selectedRole]}
                        </h2>

                        <p className={styles.sectionDescription}>
                            {ROLE_DESCRIPTIONS[selectedRole]}
                        </p>
                    </div>

                    <Tag
                        color={
                            selectedRole === 'super_admin'
                                ? 'gold'
                                : selectedRole === 'admin'
                                    ? 'green'
                                    : 'blue'
                        }
                    >
                        {selectedRole === 'super_admin'
                            ? 'Không thể chỉnh'
                            : `${selectedPermissionCodes.length} quyền`}
                    </Tag>
                </header>

                {selectedRole === 'super_admin' ? (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<LockOutlined />}
                        message="Super Admin có toàn quyền hệ thống"
                        description="Role này sử dụng permission wildcard (*). Không chỉnh bằng checkbox để tránh mất quyền quản trị hệ thống."
                    />
                ) : (
                    <>
                        <div className={styles.permissionGroups}>
                            {permissionGroups.map((group) => {
                                const groupCodes = group.items.map(
                                    (permission) =>
                                        permission.permission_code,
                                );

                                const selectedCount =
                                    groupCodes.filter((code) =>
                                        selectedPermissionCodes.includes(code),
                                    ).length;

                                const isAllSelected =
                                    selectedCount === groupCodes.length;

                                const isPartlySelected =
                                    selectedCount > 0 && !isAllSelected;

                                return (
                                    <Card
                                        key={group.groupCode}
                                        size="small"
                                        className={styles.permissionGroup}
                                    >
                                        <div
                                            className={
                                                styles.permissionGroupHeader
                                            }
                                        >
                                            <strong>{group.label}</strong>

                                            <Checkbox
                                                checked={isAllSelected}
                                                indeterminate={
                                                    isPartlySelected
                                                }
                                                disabled={saving}
                                                onChange={(event) => {
                                                    togglePermissionGroup(
                                                        groupCodes,
                                                        event.target.checked,
                                                    );
                                                }}
                                            >
                                                Chọn tất cả
                                            </Checkbox>
                                        </div>

                                        <span
                                            className={
                                                styles.permissionGroupCount
                                            }
                                        >
                                            {selectedCount}/{groupCodes.length}{' '}
                                            quyền
                                        </span>

                                        <div className={styles.permissionRows}>
                                            {group.items.map(
                                                (permission) => (
                                                    <Checkbox
                                                        key={
                                                            permission.permission_code
                                                        }
                                                        checked={selectedPermissionCodes.includes(
                                                            permission.permission_code,
                                                        )}
                                                        disabled={saving}
                                                        className={
                                                            styles.permissionRow
                                                        }
                                                        onChange={(event) => {
                                                            togglePermission(
                                                                permission.permission_code,
                                                                event.target.checked,
                                                            );
                                                        }}
                                                    >
                                                        <span
                                                            className={
                                                                styles.permissionText
                                                            }
                                                        >
                                                            {
                                                                permission.permission_description
                                                            }

                                                            <code
                                                                className={
                                                                    styles.permissionCode
                                                                }
                                                            >
                                                                {
                                                                    permission.permission_code
                                                                }
                                                            </code>
                                                        </span>
                                                    </Checkbox>
                                                ),
                                            )}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        <div className={styles.permissionSaveBar}>
                            <span>
                                {hasChanges
                                    ? 'Có thay đổi chưa được lưu.'
                                    : 'Permission đang khớp với database.'}
                            </span>

                            <Button
                                icon={<SaveOutlined />}
                                type="primary"
                                loading={saving}
                                disabled={!hasChanges}
                                onClick={() => void handleSave()}
                            >
                                Lưu quyền
                            </Button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}