'use client';

/**
 * Tab cấu hình role và permission.
 *
 * Chức năng:
 * - Chỉnh permission của Nhân viên theo từng nhóm chức năng.
 * - Chọn hoặc bỏ chọn toàn bộ quyền trong một nhóm chức năng.
 * - Lưu permission mới qua API hiện có.
 *
 * Lưu ý:
 * - Admin có toàn quyền cố định nên không xuất hiện trong tab này.
 * - API và database RPC vẫn là nơi kiểm tra quyền users.manage.
 */

import {
    useMemo,
    useState,
} from 'react';
import {
    SaveOutlined,
} from '@ant-design/icons';
import {
    Button,
    Card,
    Checkbox,
    Empty,
    Skeleton,
} from 'antd';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type {
    AccessControlPermission,
    AccessControlRole,
    EditableRoleCode,
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
    // Tab này chỉ cấu hình Employee, nên một bản nháp là đủ.
    const [permissionDraft, setPermissionDraft] =
        useState<string[] | null>(null);
    const [saving, setSaving] = useState(false);

    /** Luôn lấy role Employee từ dữ liệu API. */
    const activeRole = useMemo(() => {
        return roles.find(
            (role) => role.role_code === 'employee',
        );
    }, [roles]);

    /** Danh sách nhóm permission hiển thị ở cột phải. */
    const permissionGroups = useMemo(() => {
        return groupPermissions(permissions);
    }, [permissions]);

    /**
     * Nếu chưa tick checkbox, đọc quyền thẳng từ dữ liệu API.
     * Khi người dùng chỉnh sửa, chỉ lưu bản nháp cho đúng role đó.
     * Cách này không cần useEffect để chép props vào state.
     */
    const selectedPermissionCodes =
        permissionDraft ??
        activeRole?.permission_codes ?? [];

    const hasChanges =
        !hasSamePermissions(
            selectedPermissionCodes,
            activeRole?.permission_codes ?? [],
        );

    /** Cập nhật bản nháp Employee từ thao tác checkbox. */
    function updatePermissionDraft(
        update: (current: string[]) => string[],
    ) {

        setPermissionDraft((currentDraft) =>
            update(currentDraft ?? activeRole?.permission_codes ?? []),
        );
    }

    /** Bật hoặc tắt một permission đơn lẻ. */
    function togglePermission(
        permissionCode: string,
        checked: boolean,
    ) {
        updatePermissionDraft((current) => {
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
        updatePermissionDraft((current) => {
            if (checked) {
                return [...new Set([...current, ...permissionCodes])];
            }

            return current.filter(
                (code) => !permissionCodes.includes(code),
            );
        });
    }

    /** Lưu danh sách permission mới cho Employee. */
    async function handleSave() {

        const editableRoleCode: EditableRoleCode = 'employee';

        const confirmed = await confirmDialog(
            `Bạn sắp cập nhật ${selectedPermissionCodes.length} quyền cho Nhân viên.`,
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
                editableRoleCode,
                selectedPermissionCodes,
            );

            toast.success('Đã cập nhật permission của role.');
            await onRoleChanged();

            // Dữ liệu mới đã được tải lại từ API, nên bỏ bản nháp cũ.
            setPermissionDraft(null);
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
        <div className={styles.permissionsOnlyWorkspace}>
            <section className={styles.permissionWorkspace}>
                <header className={styles.permissionWorkspaceHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>
                            Cấu hình quyền Nhân viên
                        </h2>

                        <p className={styles.sectionDescription}>
                            Chọn những chức năng Nhân viên được phép sử dụng.
                        </p>
                    </div>

                </header>


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
            </section>
        </div>
    );
}
