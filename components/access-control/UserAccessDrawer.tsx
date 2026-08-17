'use client';

/**
 * Drawer xem và thay đổi quyền của một người dùng.
 *
 * Chức năng:
 * - Hiển thị thông tin tài khoản đang chọn.
 * - Cho người quản trị chọn role mới.
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
import useSWR from 'swr';
import {
    Alert,
    Button,
    Collapse,
    Descriptions,
    Drawer,
    Select,
    Skeleton,
    Tag,
} from 'antd';
import {
    fetchAccessControlData,
    getAccessControlErrorMessage,
    type AccessControlAssignableRole,
    type AccessControlPermission,
    type AccessControlUser,
    type ManagedRoleCode,
} from './access-control-api';
import { useLanguage } from '@/hooks/useLanguage';
import {
    tac,
    tacPermission,
    tacPermissionGroup,
    tacTemplate,
} from '@/lib/i18n/pages/access-control';
import styles from './AccessControlPage.module.css';

type UserAccessDrawerProps = {
    user: AccessControlUser | null;
    roles: AccessControlAssignableRole[];
    saving: boolean;
    onClose: () => void;
    onSave: (
        userId: string,
        roleCode: ManagedRoleCode,
    ) => Promise<void>;
};

/** Mảng rỗng dùng chung để useMemo không nhận một `[]` mới mỗi lần render. */
const EMPTY_PERMISSIONS: AccessControlPermission[] = [];

export default function UserAccessDrawer({
    user,
    roles,
    saving,
    onClose,
    onSave,
}: UserAccessDrawerProps) {
    const { language } = useLanguage();
    const [selectedRole, setSelectedRole] =
        useState<ManagedRoleCode>(
            () => user?.role_code ??
                roles.find((role) => role.is_active)?.role_code ?? '',
        );

    // UserDirectory truyền key riêng theo user (và fallback khác Edit drawer)
    // để remount form khi đổi user, không đụng key trùng sibling.
    // Vì vậy state trên luôn bắt đầu từ role hiện tại, không cần useEffect.

    /** Lấy thông tin đầy đủ của role đang chọn. */
    const selectedRoleInfo = useMemo(() => {
        return roles.find(
            (role) => role.role_code === selectedRole,
        );
    }, [roles, selectedRole]);

    /** Role có wildcard (*) là toàn quyền, không cần liệt kê từng quyền. */
    const hasFullAccess =
        selectedRoleInfo?.permission_codes.includes('*') ?? false;

    /**
     * Chỉ tải catalog khi Drawer đang mở cho role không dùng wildcard (*).
     *
     * Dùng chung SWR key với tab Role & quyền. Nếu tab đó đã tải catalog,
     * Drawer dùng ngay cache RAM thay vì gọi thêm API.
     */
    const {
        data: permissionCatalogData,
        error: permissionCatalogError,
        isLoading: loadingPermissions,
        mutate: reloadPermissions,
    } = useSWR(
        user && !hasFullAccess
            ? 'access-control/roles-permissions'
            : null,
        fetchAccessControlData,
        {
            dedupingInterval: 60_000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        },
    );

    const permissions =
        permissionCatalogData?.permissions ?? EMPTY_PERMISSIONS;

    const permissionsError =
        permissionCatalogError
            ? getAccessControlErrorMessage(
                permissionCatalogError,
                language,
                'loadPermissionDescriptionsFailed',
            )
            : null;

    /**
     * Không gửi request nếu role không đổi hoặc role đang ngừng dùng.
     * User đang dùng role cũ vẫn có thể chuyển sang một role đang hoạt động khác.
     */
    const canSaveRole =
        Boolean(selectedRoleInfo?.is_active) &&
        selectedRole !== user?.role_code;

    /** Gom permission theo nhóm để Drawer dễ đọc hơn. */
    const permissionGroups = useMemo(() => {
        if (hasFullAccess || !selectedRoleInfo) {
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
            const groupCode = permissionCode.split('.')[0];
            const groupName = tacPermissionGroup(
                groupCode,
                tac('otherFeatureGroup', language),
                language,
            );
            const currentGroup = groups.get(groupName) ?? [];

            currentGroup.push(permissionCode);
            groups.set(groupName, currentGroup);
        }

        return Array.from(groups.entries()).map(
            ([groupName, permissionCodes]) => ({
                key: groupName,
                label: tacTemplate('permissionGroupSummary', language, {
                    group: groupName,
                    count: permissionCodes.length,
                }),
                children: (
                    <div className={styles.effectivePermissionList}>
                        {permissionCodes.map((permissionCode) => (
                            <div
                                key={permissionCode}
                                className={styles.effectivePermissionItem}
                            >
                                <strong>
                                    {tacPermission(
                                        permissionCode,
                                        descriptionByCode.get(permissionCode) ??
                                            permissionCode,
                                        language,
                                    )}
                                </strong>

                                <code>{permissionCode}</code>
                            </div>
                        ))}
                    </div>
                ),
            }),
        );
    }, [hasFullAccess, language, permissions, selectedRoleInfo]);

    async function handleSave() {
        if (!user || !canSaveRole) return;

        await onSave(user.user_id, selectedRole);
    }

    return (
        <Drawer
            title={tac('assignUserRole', language)}
            open={Boolean(user)}
            size={560}
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
                        <Descriptions.Item label={tac('user', language)}>
                            {user.display_name || tac('unnamedUser', language)}
                        </Descriptions.Item>

                        <Descriptions.Item label={tac('email', language)}>
                            {user.email || tac('noEmail', language)}
                        </Descriptions.Item>

                        <Descriptions.Item label={tac('status', language)}>
                            <Tag color={user.is_active ? 'green' : 'red'}>
                                {user.is_active
                                    ? tac('active', language)
                                    : tac('locked', language)}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    <div className={styles.drawerField}>
                        <label htmlFor="user-role-select">
                            {tac('role', language)}
                        </label>

                        <Select
                            id="user-role-select"
                            value={selectedRole}
                            disabled={saving}
                            onChange={setSelectedRole}
                            options={roles.map((role) => ({
                                value: role.role_code,
                                label: role.is_active
                                    ? role.role_label
                                    : `${role.role_label} ${tac(
                                        'roleDisabledSuffix',
                                        language,
                                    )}`,
                                disabled: !role.is_active,
                            }))}
                        />

                        <p>
                            {selectedRoleInfo?.role_description ??
                                tac('noRoleDescription', language)}
                        </p>
                    </div>

                    {hasFullAccess ? (
                        <Alert
                            type="warning"
                            showIcon
                            title={tac('fullAccessTitle', language)}
                            description={tac('fullAccessDescription', language)}
                        />
                    ) : loadingPermissions ? (
                        <Skeleton active paragraph={{ rows: 6 }} />
                    ) : permissionsError ? (
                        <Alert
                            type="error"
                            showIcon
                            title={tac('cannotLoadPermissions', language)}
                            description={permissionsError}
                            action={
                                <Button
                                    size="small"
                                    onClick={() => void reloadPermissions()}
                                >
                                    {tac('retry', language)}
                                </Button>
                            }
                        />
                    ) : (
                        <section className={styles.effectivePermissions}>
                            <div>
                                <h3>
                                    {tac(
                                        'effectivePermissionsAfterSave',
                                        language,
                                    )}
                                </h3>

                                <p>
                                    {tacTemplate(
                                        'rolePermissionTotal',
                                        language,
                                        {
                                            count:
                                                selectedRoleInfo?.permission_codes
                                                    .length ?? 0,
                                        },
                                    )}
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
                            {tac('cancel', language)}
                        </Button>

                        <Button
                            type="primary"
                            loading={saving}
                            disabled={saving || !canSaveRole}
                            onClick={() => void handleSave()}
                        >
                            {tac('saveRole', language)}
                        </Button>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
