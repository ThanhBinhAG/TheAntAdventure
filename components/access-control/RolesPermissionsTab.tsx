'use client';

/**
 * Tab cấu hình role nhân viên động.
 *
 * Danh sách chỉ hiển thị các role nghiệp vụ, ví dụ: Nhân viên, Sale.
 * Role hệ thống toàn quyền (admin, super_admin) không xuất hiện. Người quản trị
 * cấu hình permission một lần cho role rồi gán cùng role đó cho nhiều người.
 */

import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import useSWR from 'swr';
import {
    EditOutlined,
    PlusOutlined,
    SaveOutlined,
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
import {
    createAccessControlPermission,
    createAccessControlStaffRole,
    fetchAccessControlStaffRoles,
    updateAccessControlStaffRole,
    updateAccessControlStaffRolePermissions,
    type AccessControlPermission,
    type AccessControlStaffRole,
    type CreateAccessControlPermissionInput,
    type CreateAccessControlStaffRoleInput,
} from './access-control-api';
import StaffRoleCreateDrawer from './StaffRoleCreateDrawer';
import StaffRoleEditDrawer from './StaffRoleEditDrawer';
import PermissionCreateDrawer from './PermissionCreateDrawer';
import styles from './AccessControlPage.module.css';
import useRefreshAccessControlAuditLogs from './useRefreshAccessControlAuditLogs';


type RolesPermissionsTabProps = {
    permissions: AccessControlPermission[];
    loadingPermissions: boolean;
    permissionsError: string | null;
    onRetryPermissions: () => Promise<void>;
    canCreatePermission: boolean;
    onPermissionsChanged: () => Promise<void>;
};


type PermissionGroup = {
    code: string;
    label: string;
    sortOrder: number;
    items: AccessControlPermission[];
};

function groupPermissions(
    permissions: AccessControlPermission[],
): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();

    for (const permission of permissions) {
        const group = groups.get(permission.group_code);

        if (group) {
            group.items.push(permission);
            continue;
        }

        groups.set(permission.group_code, {
            code: permission.group_code,
            label: permission.group_label,
            sortOrder: permission.group_sort_order,
            items: [permission],
        });
    }

    return [...groups.values()].sort(
        (first, second) =>
            first.sortOrder - second.sortOrder ||
            first.label.localeCompare(second.label, 'vi'),
    );
}

function hasSamePermissions(first: string[], second: string[]) {
    return first.length === second.length && first.every((code) => second.includes(code));
}

export default function RolesPermissionsTab({
    permissions,
    loadingPermissions,
    permissionsError,
    onRetryPermissions,
    canCreatePermission,
    onPermissionsChanged,
}: RolesPermissionsTabProps) {
    const refreshAuditLogs = useRefreshAccessControlAuditLogs();
    const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccessControlStaffRole | null>(null);
    // State của Drawer phải thuộc component để React giữ đúng theo từng lần render.
    const [permissionCreateOpen, setPermissionCreateOpen] = useState(false);
    const [creatingPermission, setCreatingPermission] = useState(false);

    const { data: roles = [], error: rolesError, isLoading: loadingRoles, mutate } = useSWR(
        'access-control/staff-roles',
        fetchAccessControlStaffRoles,
        { dedupingInterval: 60_000, revalidateOnFocus: false, revalidateOnReconnect: true },
    );

    const activeRole = roles.find((role) => role.role_code === selectedRoleCode)
        ?? roles.find((role) => role.is_active)
        ?? roles[0];

    const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);
    const permissionGroupOptions = useMemo(
        () => permissionGroups.map(({ code, label, sortOrder }) => ({
            code,
            label,
            sortOrder,
        })),
        [permissionGroups],
    );
    const selectedPermissionCodes = activeRole
        ? drafts[activeRole.role_code] ?? activeRole.permission_codes
        : [];
    const hasChanges = activeRole
        ? !hasSamePermissions(selectedPermissionCodes, activeRole.permission_codes)
        : false;

    const reloadRoles = useCallback(async () => { await mutate(); }, [mutate]);

    async function handleCreatePermission(
        input: CreateAccessControlPermissionInput,
    ) {
        setCreatingPermission(true);

        try {
            await createAccessControlPermission(input);

            // Database là nguồn dữ liệu chuẩn: reload để lấy cả permission lẫn nhóm mới.
            await onPermissionsChanged();
            refreshAuditLogs();
            setPermissionCreateOpen(false);
            toast.success('Đã thêm chức năng mới.');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể thêm chức năng mới.',
            );

            // Không đóng Drawer khi lỗi để Super Admin sửa và gửi lại dữ liệu.
            throw error;
        } finally {
            setCreatingPermission(false);
        }
    }

    function updateDraft(update: (current: string[]) => string[]) {
        if (!activeRole) return;
        setDrafts((current) => ({
            ...current,
            [activeRole.role_code]: update(current[activeRole.role_code] ?? activeRole.permission_codes),
        }));
    }

    async function handleCreate(input: CreateAccessControlStaffRoleInput) {
        setSaving(true);
        try {
            await createAccessControlStaffRole(input);
            await reloadRoles();
            refreshAuditLogs();
            setSelectedRoleCode(input.code);
            setCreateOpen(false);
            toast.success('Đã tạo role nhân viên.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể tạo role.');
            throw error;
        } finally {
            setSaving(false);
        }
    }

    async function handleEdit(input: { code: string; label: string; description?: string; sortOrder: number; isActive: boolean }) {
        setSaving(true);
        try {
            await updateAccessControlStaffRole(input);
            await reloadRoles();
            refreshAuditLogs();
            setEditingRole(null);
            toast.success('Đã cập nhật role nhân viên.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể cập nhật role.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSavePermissions() {
        if (!activeRole) return;
        const confirmed = await confirmDialog(
            `Bạn sắp cập nhật ${selectedPermissionCodes.length} quyền cho role ${activeRole.role_label}.`,
            { title: 'Xác nhận cập nhật quyền', confirmLabel: 'Lưu quyền', cancelLabel: 'Hủy', danger: false },
        );
        if (!confirmed) return;
        setSaving(true);
        try {
            await updateAccessControlStaffRolePermissions(activeRole.role_code, selectedPermissionCodes);
            await reloadRoles();
            refreshAuditLogs();
            setDrafts((current) => {
                const next = { ...current };
                delete next[activeRole.role_code];
                return next;
            });
            toast.success('Đã cập nhật permission của role.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể cập nhật permission.');
        } finally {
            setSaving(false);
        }
    }

    if (loadingPermissions) return <Skeleton active paragraph={{ rows: 12 }} />;
    if (permissionsError) return <Alert type="error" showIcon message="Không thể tải permission" description={permissionsError} action={<Button size="small" onClick={() => void onRetryPermissions()}>Thử lại</Button>} />;
    if (loadingRoles) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (rolesError) return <Alert type="error" showIcon message="Không thể tải role nhân viên" description={rolesError instanceof Error ? rolesError.message : 'Vui lòng thử lại.'} action={<Button size="small" onClick={() => void reloadRoles()}>Thử lại</Button>} />;

    return (
        <div className={styles.rolesWorkspace}>
            <aside className={styles.roleList}>
                <div className={styles.roleListHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Role nhân viên</h2>
                        <p className={styles.sectionDescription}>Một role có thể dùng cho nhiều nhân viên.</p>
                    </div>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Thêm</Button>
                </div>

                {roles.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có role nhân viên" />
                ) : roles.map((role) => (
                    <button key={role.role_code} type="button" className={`${styles.roleChoice} ${activeRole?.role_code === role.role_code ? styles.roleChoiceActive : ''}`} onClick={() => setSelectedRoleCode(role.role_code)}>
                        {/* Tách tên và số quyền thành hai vùng để chữ không bị chèn lên nhau. */}
                        <span className={styles.roleChoiceContent}>
                            <span className={styles.roleChoiceText}>
                                <strong>{role.role_label}</strong>
                                <small>{role.role_description || 'Chưa có mô tả.'}</small>
                            </span>
                            <span className={styles.roleChoiceCount}>
                                {role.permission_codes.length} quyền
                            </span>
                        </span>
                        <span className={styles.roleChoiceFooter}>
                            <span>{role.assigned_user_count} nhân viên</span>
                            {!role.is_active && <Tag color="default">Ngừng dùng</Tag>}
                        </span>
                    </button>
                ))}
            </aside>

            <section className={styles.permissionWorkspace}>
                {!activeRole ? (
                    <Empty description="Hãy tạo role nhân viên đầu tiên." />
                ) : (
                    <>
                        <header className={styles.permissionWorkspaceHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Quyền của {activeRole.role_label}</h2>
                                <p className={styles.sectionDescription}>{activeRole.role_description || 'Chọn những chức năng role này được phép sử dụng.'}</p>
                            </div>
                            <div className={styles.permissionWorkspaceActions}>
                                {/* Chỉ là lớp UX; API và RPC vẫn chặn mọi role khác. */}
                                {canCreatePermission && (
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setPermissionCreateOpen(true)}
                                    >
                                        Thêm chức năng
                                    </Button>
                                )}
                                <Button icon={<EditOutlined />} onClick={() => setEditingRole(activeRole)}>Sửa role</Button>
                            </div>
                        </header>
                        {!activeRole.is_active ? (
                            <Alert type="warning" showIcon message="Role này đã ngừng sử dụng." description="Không thể sửa permission của role đang ngừng sử dụng." />
                        ) : (
                            <>
                                <div className={styles.permissionGroups}>
                                    {permissionGroups.map((group) => {
                                        const codes = group.items.map((item) => item.permission_code);
                                        const selectedCount = codes.filter((code) => selectedPermissionCodes.includes(code)).length;
                                        return <Card key={group.code} size="small" className={styles.permissionGroup}>
                                            <div className={styles.permissionGroupHeader}>
                                                <strong>{group.label}</strong>
                                                <Checkbox checked={selectedCount === codes.length} indeterminate={selectedCount > 0 && selectedCount < codes.length} disabled={saving} onChange={(event) => updateDraft((current) => event.target.checked ? [...new Set([...current, ...codes])] : current.filter((code) => !codes.includes(code)))}>Chọn tất cả</Checkbox>
                                            </div>
                                            <span className={styles.permissionGroupCount}>{selectedCount}/{codes.length} quyền</span>
                                            <div className={styles.permissionRows}>
                                                {group.items.map((permission) => <Checkbox key={permission.permission_code} checked={selectedPermissionCodes.includes(permission.permission_code)} disabled={saving} className={styles.permissionRow} onChange={(event) => updateDraft((current) => event.target.checked ? [...new Set([...current, permission.permission_code])] : current.filter((code) => code !== permission.permission_code))}><span className={styles.permissionText}>{permission.permission_description}</span></Checkbox>)}
                                            </div>
                                        </Card>;
                                    })}
                                </div>
                                <div className={styles.permissionSaveBar}>
                                    <span>{hasChanges ? 'Có thay đổi chưa được lưu.' : 'Permission đang khớp với database.'}</span>
                                    <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!hasChanges} onClick={() => void handleSavePermissions()}>Lưu quyền</Button>
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>
            <StaffRoleCreateDrawer open={createOpen} saving={saving} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
            <StaffRoleEditDrawer role={editingRole} saving={saving} onClose={() => setEditingRole(null)} onSubmit={handleEdit} />
            <PermissionCreateDrawer
                open={permissionCreateOpen}
                saving={creatingPermission}
                groups={permissionGroupOptions}
                onClose={() => setPermissionCreateOpen(false)}
                onSubmit={handleCreatePermission}
            />
        </div>
    );
}
