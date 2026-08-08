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
import { useLanguage } from '@/hooks/useLanguage';
import {
    tac,
    tacPermission,
    tacPermissionGroup,
    tacTemplate,
} from '@/lib/i18n/pages/access-control';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import {
    createAccessControlStaffRole,
    deleteAccessControlStaffRole,
    fetchAccessControlData,
    fetchAccessControlStaffRoles,
    getAccessControlErrorMessage,
    updateAccessControlStaffRole,
    updateAccessControlStaffRolePermissions,
    type AccessControlPermission,
    type AccessControlStaffRole,
    type CreateAccessControlStaffRoleInput,
} from './access-control-api';
import StaffRoleCreateDrawer from './StaffRoleCreateDrawer';
import StaffRoleEditDrawer from './StaffRoleEditDrawer';
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
    databaseLabel: string;
    sortOrder: number;
    items: AccessControlPermission[];
};

function groupPermissions(
    permissions: AccessControlPermission[],
    language: 'en' | 'vi',
): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();

    for (const permission of permissions) {
        const group = groups.get(permission.group_code);

        if (group) {
            group.items.push({
                ...permission,
                permission_description: tacPermission(
                    permission.permission_code,
                    permission.permission_description,
                    language,
                ),
            });
            continue;
        }

        groups.set(permission.group_code, {
            code: permission.group_code,
            label: tacPermissionGroup(
                permission.group_code,
                permission.group_label,
                language,
            ),
            databaseLabel: permission.group_label,
            sortOrder: permission.group_sort_order,
            items: [{
                ...permission,
                permission_description: tacPermission(
                    permission.permission_code,
                    permission.permission_description,
                    language,
                ),
            }],
        });
    }

    return [...groups.values()].sort(
        (first, second) =>
            first.sortOrder - second.sortOrder ||
            first.label.localeCompare(second.label, language),
    );
}

function hasSamePermissions(first: string[], second: string[]) {
    return first.length === second.length && first.every((code) => second.includes(code));
}

export default function RolesPermissionsTab() {
    const { language } = useLanguage();
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
    // Removed unused canCreatePermission

    const permissionsError =
        permissionCatalogError
            ? getAccessControlErrorMessage(
                permissionCatalogError,
                language,
                'loadPermissionsFailed',
            )
            : null;

    /** Tải lại catalog sau khi tạo permission hoặc nhóm permission mới. */
    const reloadPermissions = useCallback(async (): Promise<void> => {
        await reloadPermissionCatalog();
    }, [reloadPermissionCatalog]);
    // Removed unused usePermissions hook call
    const refreshAuditLogs = useRefreshAccessControlAuditLogs();
    const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccessControlStaffRole | null>(null);
    const [permissionSearch, setPermissionSearch] = useState('');
    // State của Drawer phải thuộc component để React giữ đúng theo từng lần render.
    // Removed super admin custom permission creation state

    const { data: roles = [], error: rolesError, isLoading: loadingRoles, mutate } = useSWR(
        'access-control/staff-roles',
        fetchAccessControlStaffRoles,
        { dedupingInterval: 60_000, revalidateOnFocus: false, revalidateOnReconnect: true },
    );

    const catalogPermissionCodes = useMemo(
        () => new Set(permissions.map((p) => p.permission_code)),
        [permissions],
    );

    const processedRoles = useMemo(() => {
        return roles.map((role) => ({
            ...role,
            permission_codes: role.permission_codes.filter(
                (code) => code === '*' || code === 'users.manage' || catalogPermissionCodes.has(code)
            ),
        }));
    }, [roles, catalogPermissionCodes]);

    const activeRole = processedRoles.find((role) => role.role_code === selectedRoleCode)
        ?? processedRoles.find((role) => role.is_active)
        ?? processedRoles[0];

    const permissionGroups = useMemo(
        () => groupPermissions(permissions, language),
        [language, permissions],
    );
    const visiblePermissionGroups = useMemo(
        () => filterPermissionGroupsByQuery(
            permissionGroups,
            permissionSearch,
        ),
        [permissionGroups, permissionSearch],
    );
    // Removed unused permissionGroupOptions
    const selectedPermissionCodes = activeRole
        ? drafts[activeRole.role_code] ?? activeRole.permission_codes
        : [];
    const hasChanges = activeRole
        ? !hasSamePermissions(selectedPermissionCodes, activeRole.permission_codes)
        : false;

    const reloadRoles = useCallback(async () => { await mutate(); }, [mutate]);

    // Removed handleCreatePermission

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
            toast.success(tac('staffRoleCreated', language));
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
            toast.success(tac('staffRoleUpdated', language));
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateRoleFailed',
            ));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteRole() {
        if (!activeRole) return;

        const confirmed = await confirmDialog(
            tacTemplate('deleteRoleConfirmation', language, {
                role: activeRole.role_label,
            }),
            {
                title: tac('confirmDeleteRole', language),
                confirmLabel: tac('deleteRoleButton', language),
                cancelLabel: tac('cancel', language),
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
            toast.success(tac('staffRoleDeleted', language));
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'deleteStaffRoleFailed',
            ));
        } finally {
            setSaving(false);
        }
    }

    async function handleSavePermissions() {
        if (!activeRole) return;
        const confirmed = await confirmDialog(
            tacTemplate('updatePermissionsConfirmation', language, {
                count: selectedPermissionCodes.length,
                role: activeRole.role_label,
            }),
            {
                title: tac('confirmUpdatePermissions', language),
                confirmLabel: tac('savePermissions', language),
                cancelLabel: tac('cancel', language),
                danger: false,
            },
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
            toast.success(tac('permissionsUpdated', language));
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updatePermissionsFailed',
            ));
        } finally {
            setSaving(false);
        }
    }

    if (loadingPermissions) return <Skeleton active paragraph={{ rows: 12 }} />;
    if (permissionsError) return <Alert type="error" showIcon message={tac('loadPermissionsFailed', language)} description={permissionsError} action={<Button size="small" onClick={() => void reloadPermissions()}>{tac('retry', language)}</Button>} />;
    if (loadingRoles) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (rolesError) return <Alert type="error" showIcon message={tac('loadRolesFailed', language)} description={getAccessControlErrorMessage(rolesError, language, 'retryMessage')} action={<Button size="small" onClick={() => void reloadRoles()}>{tac('retry', language)}</Button>} />;

    return (
        <div className={styles.rolesWorkspace}>
            <aside className={styles.roleList}>
                <div className={styles.roleListHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>{tac('roleList', language)}</h2>
                        <p className={styles.sectionDescription}>{tac('roleListDescription', language)}</p>
                    </div>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{tac('addRole', language)}</Button>
                </div>

                {processedRoles.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tac('noStaffRoles', language)} />
                ) : processedRoles.map((role) => (
                    <button key={role.role_code} type="button" className={`${styles.roleChoice} ${activeRole?.role_code === role.role_code ? styles.roleChoiceActive : ''}`} onClick={() => setSelectedRoleCode(role.role_code)}>
                        {/* Tách tên và số quyền thành hai vùng để chữ không bị chèn lên nhau. */}
                        <span className={styles.roleChoiceContent}>
                            <span className={styles.roleChoiceText}>
                                <strong>{role.role_label}</strong>
                                <small>{role.role_description || tac('noRoleDescription', language)}</small>
                            </span>
                            <span className={styles.roleChoiceCount}>
                                {role.permission_codes.length} {tac('permissionCount', language)}
                            </span>
                        </span>
                        <span className={styles.roleChoiceFooter}>
                            <span>{role.assigned_user_count} {tac('employeeCount', language)}</span>
                            {!role.is_active && <Tag color="default">{tac('inactiveRoleBadge', language)}</Tag>}
                        </span>
                    </button>
                ))}
            </aside>

            <section className={styles.permissionWorkspace}>
                {!activeRole ? (
                    <Empty description={tac('createFirstRole', language)} />
                ) : (
                    <>
                        <header className={styles.permissionWorkspaceHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>{tacTemplate('configureRole', language, { role: activeRole.role_label })}</h2>
                                <p className={styles.sectionDescription}>{activeRole.role_description || tac('editRolePermissionsHint', language)}</p>
                            </div>
                            <div className={styles.permissionWorkspaceActions}>
                                <Button icon={<EditOutlined />} onClick={() => setEditingRole(activeRole)}>{tac('editRoleButton', language)}</Button>
                                <Tooltip
                                    title={activeRole.assigned_user_count > 0
                                        ? tacTemplate('moveUsersBeforeDelete', language, { count: activeRole.assigned_user_count })
                                        : tac('deleteRoleHint', language)}
                                >
                                    {/* span giúp Tooltip vẫn hoạt động khi Button bị disabled. */}
                                    <span>
                                        <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            disabled={saving || activeRole.assigned_user_count > 0}
                                            onClick={() => void handleDeleteRole()}
                                        >
                                            {tac('deleteRoleButton', language)}
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
                                    tac('permissionSummary', language),
                                )}
                            </span>
                            {/* Catalog là dữ liệu toàn hệ thống, không phải quyền của riêng role đang chọn. */}
                            {/* Removed add permission link */}
                        </div>
                        <Input
                            aria-label={tac('searchPermissions', language)}
                            allowClear
                            className={styles.permissionSearch}
                            placeholder={tac('searchPermissions', language)}
                            prefix={<SearchOutlined />}
                            value={permissionSearch}
                            onChange={(event) => setPermissionSearch(event.target.value)}
                        />
                        {!activeRole.is_active ? (
                            <Alert type="warning" showIcon message={tac('roleDisabled', language)} description={tac('roleInactiveDescription', language)} />
                        ) : (
                            <>
                                <div className={styles.permissionGroups}>
                                    {visiblePermissionGroups.length === 0 ? (
                                        <Empty
                                            className={styles.permissionSearchEmpty}
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={tac('noMatchingPermissions', language)}
                                        />
                                    ) : visiblePermissionGroups.map((group) => {
                                        const codes = group.items.map((item) => item.permission_code);
                                        const selectedCount = codes.filter((code) => selectedPermissionCodes.includes(code)).length;
                                        return <Card key={group.code} size="small" className={styles.permissionGroup}>
                                            <div className={styles.permissionGroupHeader}>
                                                <div className={styles.permissionGroupTitle}>
                                                    <strong>{group.label}</strong>
                                                    <span>{selectedCount}/{codes.length} {tac('permissionCount', language)}</span>
                                                </div>
                                                {codes.length > 1 && !permissionSearch.trim() && (
                                                    <Checkbox
                                                        aria-label={tacTemplate('selectAllGroupPermissions', language, { group: group.label })}
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
                                            ? tac('unsavedChanges', language)
                                            : tac('noUnsavedChanges', language)}
                                    </span>
                                    <div className={styles.permissionSaveActions}>
                                        <Button
                                            disabled={!hasChanges || saving}
                                            onClick={handleDiscardPermissionChanges}
                                        >
                                            {tac('discardChanges', language)}
                                        </Button>
                                        <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!hasChanges} onClick={() => void handleSavePermissions()}>{tac('savePermissions', language)}</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </section>
            <StaffRoleCreateDrawer open={createOpen} saving={saving} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
            <StaffRoleEditDrawer role={editingRole} saving={saving} onClose={() => setEditingRole(null)} onSubmit={handleEdit} />
            {/* Removed PermissionCreateDrawer */}
        </div>
    );
}
