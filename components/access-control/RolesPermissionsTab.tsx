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
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SaveOutlined,
    SearchOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Empty,
    Input,
    Skeleton,
    Tag,
    Tooltip,
} from 'antd';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { usePermissions } from '@/components/PermissionsProvider';
import {
    createAccessControlPermission,
    createAccessControlStaffRole,
    deleteAccessControlStaffRole,
    fetchAccessControlData,
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
import {
    discardRolePermissionDraft,
    filterPermissionGroupsByQuery,
    formatPermissionAssignmentSummary,
} from './role-permission-ui';
import styles from './AccessControlPage.module.css';
import useRefreshAccessControlAuditLogs from './useRefreshAccessControlAuditLogs';

/**
 * Dùng chung một mảng rỗng ổn định.
 * Tránh tạo `[]` mới ở mỗi lần render làm useMemo chạy lại không cần thiết.
 */
const EMPTY_PERMISSIONS: AccessControlPermission[] = [];

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

export default function RolesPermissionsTab() {
    /**
 * Chỉ chạy khi tab Role & quyền đã được mở.
 * AccessControlPage chỉ mount component này sau khi người dùng bấm tab.
 */
    const {
        data: accessControlData,
        error: permissionCatalogError,
        isLoading: loadingPermissions,
        mutate: reloadPermissionCatalog,
    } = useSWR(
        'access-control/roles-permissions',
        fetchAccessControlData,
        {
            // Giữ cơ chế an toàn cũ: kiểm tra lại khi component được mount.
            revalidateOnMount: true,
            dedupingInterval: 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        },
    );

    const permissions =
        accessControlData?.permissions ?? EMPTY_PERMISSIONS;
    const canCreatePermission =
        accessControlData?.canCreatePermission ?? false;

    const permissionsError =
        permissionCatalogError instanceof Error
            ? permissionCatalogError.message
            : permissionCatalogError
                ? 'Không thể tải dữ liệu permission.'
                : null;

    /** Tải lại catalog sau khi tạo permission hoặc nhóm permission mới. */
    const reloadPermissions = useCallback(async (): Promise<void> => {
        await reloadPermissionCatalog();
    }, [reloadPermissionCatalog]);
    const { can } = usePermissions();
    const refreshAuditLogs = useRefreshAccessControlAuditLogs();
    const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccessControlStaffRole | null>(null);
    const [permissionSearch, setPermissionSearch] = useState('');
    // State của Drawer phải thuộc component để React giữ đúng theo từng lần render.
    const [permissionCreateOpen, setPermissionCreateOpen] = useState(false);
    const [creatingPermission, setCreatingPermission] = useState(false);

    // `canCreatePermission` được xác nhận lại ở API/RPC. Kiểm tra wildcard
    // ở client là lớp hiển thị bổ sung, tránh cache cũ của một session Super
    // Admin làm Admin thấy nhầm action trong lúc SWR đang tải lại.
    const canManagePermissionCatalog = canCreatePermission && can('*');

    const { data: roles = [], error: rolesError, isLoading: loadingRoles, mutate } = useSWR(
        'access-control/staff-roles',
        fetchAccessControlStaffRoles,
        { dedupingInterval: 60_000, revalidateOnFocus: false, revalidateOnReconnect: true },
    );

    const activeRole = roles.find((role) => role.role_code === selectedRoleCode)
        ?? roles.find((role) => role.is_active)
        ?? roles[0];

    const permissionGroups = useMemo(() => groupPermissions(permissions), [permissions]);
    const visiblePermissionGroups = useMemo(
        () => filterPermissionGroupsByQuery(
            permissionGroups,
            permissionSearch,
        ),
        [permissionGroups, permissionSearch],
    );
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
            await reloadPermissions();
            refreshAuditLogs();
            setPermissionCreateOpen(false);
            toast.success('Đã thêm quyền hoặc nhóm quyền mới.');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể thêm quyền hoặc nhóm quyền mới.',
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

    /** Chỉ bỏ thay đổi trên giao diện; database chưa bị gọi khi chưa bấm Lưu. */
    function handleDiscardPermissionChanges() {
        if (!activeRole) return;

        setDrafts((current) => discardRolePermissionDraft(
            current,
            activeRole.role_code,
        ));
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

    async function handleDeleteRole() {
        if (!activeRole) return;

        const confirmed = await confirmDialog(
            `Xóa role ${activeRole.role_label}? Permission của role này cũng sẽ bị xóa và không thể khôi phục.`,
            {
                title: 'Xác nhận xóa role',
                confirmLabel: 'Xóa role',
                cancelLabel: 'Hủy',
                danger: true,
            },
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            await deleteAccessControlStaffRole(activeRole.role_code);
            await reloadRoles();
            refreshAuditLogs();
            setDrafts((current) => discardRolePermissionDraft(
                current,
                activeRole.role_code,
            ));
            // Role vừa xóa không còn hợp lệ để giữ làm lựa chọn hiện tại.
            setSelectedRoleCode(null);
            toast.success('Đã xóa role nhân viên.');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể xóa role nhân viên.',
            );
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
    if (permissionsError) return <Alert type="error" showIcon message="Không thể tải permission" description={permissionsError} action={<Button size="small" onClick={() => void reloadPermissions()}>Thử lại</Button>} />;
    if (loadingRoles) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (rolesError) return <Alert type="error" showIcon message="Không thể tải role nhân viên" description={rolesError instanceof Error ? rolesError.message : 'Vui lòng thử lại.'} action={<Button size="small" onClick={() => void reloadRoles()}>Thử lại</Button>} />;

    return (
        <div className={styles.rolesWorkspace}>
            <aside className={styles.roleList}>
                <div className={styles.roleListHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Danh sách role</h2>
                        <p className={styles.sectionDescription}>Mỗi role có thể dùng cho nhiều nhân viên.</p>
                    </div>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Thêm role</Button>
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
                                <h2 className={styles.sectionTitle}>Cấu hình quyền: {activeRole.role_label}</h2>
                                <p className={styles.sectionDescription}>{activeRole.role_description || 'Chỉnh sửa quyền được cấp cho role này.'}</p>
                            </div>
                            <div className={styles.permissionWorkspaceActions}>
                                <Button icon={<EditOutlined />} onClick={() => setEditingRole(activeRole)}>Sửa role</Button>
                                <Tooltip
                                    title={activeRole.assigned_user_count > 0
                                        ? `Cần chuyển ${activeRole.assigned_user_count} nhân viên sang role khác trước.`
                                        : 'Xóa role này'}
                                >
                                    {/* span giúp Tooltip vẫn hoạt động khi Button bị disabled. */}
                                    <span>
                                        <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            disabled={saving || activeRole.assigned_user_count > 0}
                                            onClick={() => void handleDeleteRole()}
                                        >
                                            Xóa role
                                        </Button>
                                    </span>
                                </Tooltip>
                            </div>
                        </header>
                        <div className={styles.permissionWorkspaceMeta}>
                            <span>
                                {formatPermissionAssignmentSummary(
                                    selectedPermissionCodes.length,
                                    permissions.length,
                                )}
                            </span>
                            {/* Catalog là dữ liệu toàn hệ thống, không phải quyền của riêng role đang chọn. */}
                            {canManagePermissionCatalog && (
                                <div className={styles.permissionCatalogAction}>
                                    <span className={styles.permissionCatalogNote}>
                                        Chỉ Super Admin
                                    </span>
                                    <Button
                                        type="link"
                                        icon={<SettingOutlined />}
                                        className={styles.permissionCatalogButton}
                                        onClick={() => setPermissionCreateOpen(true)}
                                    >
                                        Thêm quyền / nhóm quyền
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Input
                            aria-label="Tìm quyền hoặc nhóm chức năng"
                            allowClear
                            className={styles.permissionSearch}
                            placeholder="Tìm quyền hoặc nhóm chức năng..."
                            prefix={<SearchOutlined />}
                            value={permissionSearch}
                            onChange={(event) => setPermissionSearch(event.target.value)}
                        />
                        {!activeRole.is_active ? (
                            <Alert type="warning" showIcon message="Role này đã ngừng sử dụng." description="Không thể sửa permission của role đang ngừng sử dụng." />
                        ) : (
                            <>
                                <div className={styles.permissionGroups}>
                                    {visiblePermissionGroups.length === 0 ? (
                                        <Empty
                                            className={styles.permissionSearchEmpty}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description="Không tìm thấy quyền hoặc nhóm chức năng phù hợp"
                                        />
                                    ) : visiblePermissionGroups.map((group) => {
                                        const codes = group.items.map((item) => item.permission_code);
                                        const selectedCount = codes.filter((code) => selectedPermissionCodes.includes(code)).length;
                                        return <Card key={group.code} size="small" className={styles.permissionGroup}>
                                            <div className={styles.permissionGroupHeader}>
                                                <div className={styles.permissionGroupTitle}>
                                                    <strong>{group.label}</strong>
                                                    <span>{selectedCount}/{codes.length} quyền</span>
                                                </div>
                                                {codes.length > 1 && !permissionSearch.trim() && (
                                                    <Checkbox
                                                        aria-label={`Chọn tất cả quyền trong nhóm ${group.label}`}
                                                        checked={selectedCount === codes.length}
                                                        indeterminate={selectedCount > 0 && selectedCount < codes.length}
                                                        disabled={saving}
                                                        onChange={(event) => updateDraft((current) => event.target.checked ? [...new Set([...current, ...codes])] : current.filter((code) => !codes.includes(code)))}
                                                    />
                                                )}
                                            </div>
                                            <div className={styles.permissionRows}>
                                                {group.items.map((permission) => <Checkbox key={permission.permission_code} checked={selectedPermissionCodes.includes(permission.permission_code)} disabled={saving} className={styles.permissionRow} onChange={(event) => updateDraft((current) => event.target.checked ? [...new Set([...current, permission.permission_code])] : current.filter((code) => code !== permission.permission_code))}><span className={styles.permissionText}>{permission.permission_description}</span></Checkbox>)}
                                            </div>
                                        </Card>;
                                    })}
                                </div>
                                <div className={styles.permissionSaveBar}>
                                    <span aria-live="polite">
                                        {hasChanges
                                            ? 'Có thay đổi chưa lưu.'
                                            : 'Chưa có thay đổi cần lưu.'}
                                    </span>
                                    <div className={styles.permissionSaveActions}>
                                        <Button
                                            disabled={!hasChanges || saving}
                                            onClick={handleDiscardPermissionChanges}
                                        >
                                            Hủy thay đổi
                                        </Button>
                                        <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!hasChanges} onClick={() => void handleSavePermissions()}>Lưu thay đổi</Button>
                                    </div>
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
