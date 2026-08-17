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
    DatabaseOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Empty,
    Skeleton,
    Tabs,
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
    createAccessControlPermission,
    createAccessControlStaffRole,
    deleteAccessControlStaffRole,
    fetchAccessControlData,
    fetchAccessControlStaffRoles,
    getAccessControlErrorMessage,
    updateAccessControlStaffRole,
    type AccessControlPermission,
    type AccessControlStaffRole,
    type CreateAccessControlPermissionInput,
    type CreateAccessControlStaffRoleInput,
} from './access-control-api';
import PermissionCreateDrawer from './PermissionCreateDrawer';
import StaffRoleCreateDrawer from './StaffRoleCreateDrawer';
import StaffRoleEditDrawer from './StaffRoleEditDrawer';
import {
    filterPermissionGroupsByQuery,
} from './role-permission-ui';
import styles from './AccessControlPage.module.css';
import useRefreshAccessControlAuditLogs from './useRefreshAccessControlAuditLogs';

// Import subcomponents & custom hooks
import { RolesSidebar } from './roles-permissions/RolesSidebar';
import { PermissionsTabContent } from './roles-permissions/PermissionsTabContent';
import { ResourceScopesTabContent } from './roles-permissions/ResourceScopesTabContent';
import { useRolePermissions } from './useRolePermissions';
import { useResourceScopes } from './useResourceScopes';

/**
 * Dùng chung một mảng rỗng ổn định.
 * Tránh tạo `[]` mới ở mỗi lần render làm useMemo chạy lại không cần thiết.
 */
const EMPTY_PERMISSIONS: AccessControlPermission[] = [];

type RoleConfigurationTab = 'permissions' | 'scopes';

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
            revalidateOnMount: true,
            dedupingInterval: 15_000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );

    const permissions =
        accessControlData?.permissions ?? EMPTY_PERMISSIONS;
    const canCreatePermission = accessControlData?.canCreatePermission === true;

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

    const refreshAuditLogs = useRefreshAccessControlAuditLogs();
    const [selectedRoleCode, setSelectedRoleCode] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<AccessControlStaffRole | null>(null);
    const [roleConfigurationTab, setRoleConfigurationTab] = useState<RoleConfigurationTab>('permissions');
    // State của Drawer phải thuộc component để React giữ đúng theo từng lần render.
    const [permissionCreateOpen, setPermissionCreateOpen] = useState(false);
    const [creatingPermission, setCreatingPermission] = useState(false);

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

    const reloadRoles = useCallback(async () => { await mutate(); }, [mutate]);

    // Instantiate Custom Hooks
    const rolePermissionsHook = useRolePermissions({
        activeRole,
        language,
        reloadRoles,
        refreshAuditLogs,
    });

    const resourceScopesHook = useResourceScopes({
        activeRole,
        language,
        reloadRoles,
        refreshAuditLogs,
    });

    const permissionGroups = useMemo(
        () => groupPermissions(permissions, language),
        [language, permissions],
    );
    const visiblePermissionGroups = useMemo(
        () => filterPermissionGroupsByQuery(
            permissionGroups,
            rolePermissionsHook.permissionSearch,
        ),
        [permissionGroups, rolePermissionsHook.permissionSearch],
    );
    const permissionGroupOptions = useMemo(
        () => permissionGroups.map(({ code, label, databaseLabel, sortOrder }) => ({
            code,
            label,
            databaseLabel,
            sortOrder,
        })),
        [permissionGroups],
    );

    async function handleCreatePermission(
        input: CreateAccessControlPermissionInput,
    ) {
        setCreatingPermission(true);

        try {
            await createAccessControlPermission(input);
            await reloadPermissions();
            refreshAuditLogs();
            setPermissionCreateOpen(false);
            toast.success(tac('createPermissionOrGroupSuccess', language));
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'createPermissionOrGroupFailed',
            ));
            throw error;
        } finally {
            setCreatingPermission(false);
        }
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
            // Clear drafts in both hooks
            rolePermissionsHook.clearDraft(activeRole.role_code);
            resourceScopesHook.clearDraft(activeRole.role_code);
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

    if (loadingPermissions) return <Skeleton active paragraph={{ rows: 12 }} />;
    if (permissionsError) return <Alert type="error" showIcon title={tac('loadPermissionsFailed', language)} description={permissionsError} action={<Button size="small" onClick={() => void reloadPermissions()}>{tac('retry', language)}</Button>} />;
    if (loadingRoles) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (rolesError) return <Alert type="error" showIcon title={tac('loadRolesFailed', language)} description={getAccessControlErrorMessage(rolesError, language, 'retryMessage')} action={<Button size="small" onClick={() => void reloadRoles()}>{tac('retry', language)}</Button>} />;

    return (
        <div className={styles.rolesWorkspace}>
            <RolesSidebar
                roles={processedRoles}
                activeRole={activeRole}
                selectedRoleCode={selectedRoleCode}
                onSelectRole={setSelectedRoleCode}
                onCreateOpen={() => setCreateOpen(true)}
                language={language}
            />

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
                                {canCreatePermission && (
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setPermissionCreateOpen(true)}
                                    >
                                        {tac('createPermissionOrGroup', language)}
                                    </Button>
                                )}
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
                        <Tabs
                            activeKey={roleConfigurationTab}
                            className={styles.roleConfigurationTabs}
                            onChange={(key) => setRoleConfigurationTab(key as RoleConfigurationTab)}
                            items={[
                                {
                                    key: 'permissions',
                                    label: (
                                        <span className={styles.roleConfigurationTabLabel}>
                                            <SafetyCertificateOutlined />
                                            {language === 'vi' ? 'Quyền chức năng' : 'Function permissions'}
                                        </span>
                                    ),
                                },
                                {
                                    key: 'scopes',
                                    label: (
                                        <span className={styles.roleConfigurationTabLabel}>
                                            <DatabaseOutlined />
                                            {language === 'vi' ? 'Phạm vi dữ liệu RLS' : 'RLS data scopes'}
                                        </span>
                                    ),
                                },
                            ]}
                        />

                        <div hidden={roleConfigurationTab !== 'permissions'}>
                            <PermissionsTabContent
                                activeRole={activeRole}
                                permissions={permissions}
                                visiblePermissionGroups={visiblePermissionGroups}
                                permissionSearch={rolePermissionsHook.permissionSearch}
                                setPermissionSearch={rolePermissionsHook.setPermissionSearch}
                                selectedPermissionCodes={rolePermissionsHook.selectedPermissionCodes}
                                hasChanges={rolePermissionsHook.hasChanges}
                                saving={rolePermissionsHook.saving}
                                updateDraft={rolePermissionsHook.updateDraft}
                                handleDiscardPermissionChanges={rolePermissionsHook.handleDiscardPermissionChanges}
                                handleSavePermissions={rolePermissionsHook.handleSavePermissions}
                                language={language}
                            />
                        </div>
                        <div hidden={roleConfigurationTab !== 'scopes'}>
                            <ResourceScopesTabContent
                                saving={resourceScopesHook.saving}
                                hasScopeChanges={resourceScopesHook.hasScopeChanges}
                                scopeFor={resourceScopesHook.scopeFor}
                                updateScope={resourceScopesHook.updateScope}
                                discardScopeChanges={resourceScopesHook.discardScopeChanges}
                                handleSaveResourceScopes={resourceScopesHook.handleSaveResourceScopes}
                                language={language}
                            />
                        </div>
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
