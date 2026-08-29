'use client';

/**
 * Danh sách user có thể mở rộng khi số nhân viên tăng.
 *
 * Chức năng:
 * - Tải user theo trang từ API.
 * - Tìm kiếm theo tên/email.
 * - Lọc theo role và trạng thái.
 * - Hiển thị nhãn role lấy từ database.
 * - Tạo tài khoản, sửa tên, đổi role, đổi trạng thái và xóa mềm.
 */

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
    SafetyCertificateOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Input,
    Select,
    Table,
    Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useLanguage } from '@/hooks/useLanguage';
import { tac } from '@/lib/i18n/pages/access-control';
import { toast } from '@/lib/toast';
import UserAccessDrawer from './UserAccessDrawer';
import {
    createAccessControlUser,
    fetchAccessControlStaffRoles,
    fetchAccessControlUsersPage,
    getAccessControlErrorMessage,
    updateUserRole,
    type AccessControlAssignableRole,
    type AccessControlStaffRole,
    type AccessControlUser,
    type CreateAccessControlUserInput,
    type ManagedRoleCode,
    type UserListRoleFilter,
    type UserListStatusFilter,
    updateUserDisplayName,
    updateUserPassword,
} from './access-control-api';
import styles from './AccessControlPage.module.css';
import UserActionsMenu from './UserActionsMenu';
import UserEditDrawer from './UserEditDrawer';
import UserPasswordDrawer from './UserPasswordDrawer';
import UserCreateDrawer from './UserCreateDrawer';
import useRefreshAccessControlAuditLogs from './useRefreshAccessControlAuditLogs';


/** Đổi dữ liệu role nghiệp vụ từ API về kiểu dùng chung của UI User. */
function toUserRoleOption(
    role: AccessControlStaffRole,
): AccessControlAssignableRole {
    return {
        role_code: role.role_code,
        role_label: role.role_label,
        role_description: role.role_description,
        permission_codes: role.permission_codes,
        is_active: role.is_active,
    };
}

/** Lấy nhãn role từ dữ liệu database thay vì ghi cứng Admin/Nhân viên. */
function roleLabel(
    roleCode: ManagedRoleCode | null,
    roleByCode: ReadonlyMap<string, AccessControlAssignableRole>,
    unassignedRoleLabel: string,
): string {
    if (!roleCode) return unassignedRoleLabel;

    // Nếu dữ liệu role cũ không còn tồn tại, hiện code để dễ kiểm tra.
    return roleByCode.get(roleCode)?.role_label ?? roleCode;
}

/** Admin có màu riêng; các role nghiệp vụ dùng cùng một màu dễ nhận biết. */
function roleColor(roleCode: ManagedRoleCode | null): string {
    if (roleCode === 'admin') return 'green';

    return roleCode ? 'blue' : 'default';
}

/**
 * Admin là role hệ thống toàn quyền.
 *
 * Role nhân viên như Nhân viên, Sale, Điều hành vẫn lấy động từ database.
 * Khai báo Admin tại đây giúp tab Người dùng không cần tải catalog permission
 * chỉ để biết Admin có quyền wildcard (*).
 */
const SYSTEM_ADMIN_ROLE: AccessControlAssignableRole = {
    role_code: 'admin',
    role_label: 'Admin',
    role_description: 'Quản trị viên có toàn quyền hệ thống.',
    permission_codes: ['*'],
    is_active: true,
};

export default function UserDirectory() {
    const { language } = useLanguage();
    const refreshAuditLogs = useRefreshAccessControlAuditLogs();
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] =
        useState<UserListRoleFilter>('all');
    const [statusFilter, setStatusFilter] =
        useState<UserListStatusFilter>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    /**
     * Tải role nghiệp vụ dùng chung SWR key với tab Role & quyền.
     * Nếu tab kia đã mở, SWR trả cache RAM thay vì gọi API lần nữa.
     */
    const {
        data: staffRoles = [],
        error: staffRolesError,
        isLoading: loadingStaffRoles,
    } = useSWR(
        'access-control/staff-roles',
        fetchAccessControlStaffRoles,
        {
            dedupingInterval: 60_000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        },
    );

    /**
     * Admin là role cố định toàn quyền.
     * Nhân viên, Sale và các role tạo thêm lấy từ database.
     * Super Admin không nằm trong hai nguồn này nên vẫn hoàn toàn ẩn.
     */
    /**
     * Admin là role hệ thống cố định.
     * Các role nghiệp vụ lấy từ API staff-roles.
     */
    const userRoleOptions = useMemo<AccessControlAssignableRole[]>(
        () => [
            SYSTEM_ADMIN_ROLE,
            ...staffRoles.map(toUserRoleOption),
        ],
        [staffRoles],
    );

    /** Role ngừng dùng vẫn hiển thị ở user cũ, nhưng không được gán cho user mới. */
    const activeUserRoleOptions = useMemo(
        () => userRoleOptions.filter((role) => role.is_active),
        [userRoleOptions],
    );

    /** Map giúp bảng tra nhanh role_label từ role_code của mỗi user. */
    const roleByCode = useMemo(
        () => new Map(
            userRoleOptions.map((role) => [
                role.role_code,
                role,
            ] as const),
        ),
        [userRoleOptions],
    );

    /** Bộ lọc tự có role mới tạo như Sale mà không cần sửa code lần nữa. */
    const roleFilterOptions = useMemo(
        () => [
            { value: 'all', label: tac('allRoles', language) },
            ...userRoleOptions.map((role) => ({
                value: role.role_code,
                label: role.is_active
                    ? role.role_label
                    : `${role.role_label} ${tac('roleDisabledSuffix', language)}`,
            })),
        ],
        [language, userRoleOptions],
    );

    const staffRolesErrorMessage =
        staffRolesError
            ? getAccessControlErrorMessage(
                staffRolesError,
                language,
                'loadRolesFailed',
            )
            : null;

    /**
     * Khóa cache xác định một danh sách user cụ thể.
     *
     * Mỗi tổ hợp tìm kiếm, role, trạng thái và trang có cache RAM riêng.
     * Vì vậy khi quay về bộ lọc đã xem, dữ liệu có thể hiển thị ngay
     * thay vì gọi API lặp lại.
     */
    const usersQueryKey = [
        'access-control/users',
        keyword,
        roleFilter,
        statusFilter,
        page,
        pageSize,
    ] as const;

    const {
        data,
        error,
        isLoading,
        mutate: reloadUsers,
    } = useSWR(
        usersQueryKey,
        () => fetchAccessControlUsersPage({
            keyword,
            role: roleFilter,
            status: statusFilter,
            page,
            pageSize,
        }),
        {
            // Trong 15 giây, không gửi lại cùng một request.
            dedupingInterval: 15_000,

            // Khi đổi filter/trang, giữ bảng cũ trong lúc chờ dữ liệu mới.
            keepPreviousData: true,

            // Danh sách đã được refresh sau các thao tác tạo/sửa/xóa/đổi role.
            revalidateOnFocus: false,
            focusThrottleInterval: 30_000,
            revalidateOnReconnect: true,
        },
    );

    /** Làm mới danh sách đang xem sau các thao tác thay đổi dữ liệu. */
    const refreshUsers = useCallback(async (): Promise<void> => {
        await reloadUsers();
    }, [reloadUsers]);

    /** Làm mới bảng user trước, còn audit log sẽ tự tải ở nền. */
    const refreshUsersAndAuditLogs = useCallback(async (): Promise<void> => {
        await refreshUsers();
        refreshAuditLogs();
    }, [refreshUsers, refreshAuditLogs]);

    /** Đổi lỗi kỹ thuật của SWR thành text an toàn để hiển thị. */
    const errorMessage =
        error
            ? getAccessControlErrorMessage(
                error,
                language,
                'loadUsersFailed',
            )
            : null;

    const [selectedUser, setSelectedUser] =
        useState<AccessControlUser | null>(null);
    const [savingRole, setSavingRole] = useState(false);

    const [editingUser, setEditingUser] =
        useState<AccessControlUser | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const [passwordUser, setPasswordUser] =
        useState<AccessControlUser | null>(null);
    const [savingPassword, setSavingPassword] = useState(false);

    const [isCreateDrawerOpen, setIsCreateDrawerOpen] =
        useState(false);
    const [savingCreate, setSavingCreate] = useState(false);

    async function handleSaveRole(
        userId: string,
        roleCode: ManagedRoleCode,
    ) {
        setSavingRole(true);

        try {
            await updateUserRole(userId, roleCode);

            toast.success(tac('userRoleUpdated', language));
            setSelectedUser(null);

            // Tải lại đúng trang đang xem để role mới hiển thị ngay.
            await refreshUsers();
            refreshAuditLogs();
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateUserRoleFailed',
            ));
        } finally {
            setSavingRole(false);
        }
    }
    /** Lưu tên hiển thị mới từ UserEditDrawer. */
    async function handleSaveDisplayName(
        userId: string,
        displayName: string,
    ) {
        setSavingEdit(true);

        try {
            await updateUserDisplayName(userId, displayName);

            toast.success(tac('userProfileUpdated', language));
            setEditingUser(null);

            await refreshUsers();
            refreshAuditLogs();
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateUserFailed',
            ));
        } finally {
            setSavingEdit(false);
        }
    }

    /** Lưu mật khẩu mới từ UserPasswordDrawer. */
    async function handleSavePassword(
        userId: string,
        newPassword: string,
    ) {
        setSavingPassword(true);

        try {
            await updateUserPassword(userId, newPassword);

            toast.success(tac('userPasswordUpdated', language));
            setPasswordUser(null);

            refreshAuditLogs();
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateUserPasswordFailed',
            ));
        } finally {
            setSavingPassword(false);
        }
    }

    /** Tạo Auth user mới, sau đó làm mới danh sách để thấy tài khoản vừa tạo. */
    async function handleCreateUser(
        input: CreateAccessControlUserInput,
    ) {
        setSavingCreate(true);

        try {
            await createAccessControlUser(input);
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'createUserFailed',
            ));

            // Drawer bắt lỗi này để giữ nguyên dữ liệu form cho người dùng sửa.
            throw error;
        } finally {
            setSavingCreate(false);
        }

        toast.success(tac('userCreated', language));
        setIsCreateDrawerOpen(false);
        refreshAuditLogs();

        // Bỏ các bộ lọc để user mới chắc chắn có thể nhìn thấy ở trang đầu.
        const isDefaultUserList =
            keyword === '' &&
            roleFilter === 'all' &&
            statusFilter === 'all' &&
            page === 1;

        setKeywordInput('');
        setKeyword('');
        setRoleFilter('all');
        setStatusFilter('all');
        setPage(1);

        // Nếu đã ở danh sách mặc định, state không đổi nên tự tải lại ngay.
        if (isDefaultUserList) {
            void refreshUsers();
        }
    }

    const columns: TableColumnsType<AccessControlUser> = [
        {
            title: tac('user', language),
            key: 'user',
            render: (_value: unknown, user) => (
                <div>
                    <strong>
                        {user.display_name || user.email || tac('unnamedUser', language)}
                    </strong>

                    {user.display_name && user.email && (
                        <div className={styles.userEmail}>
                            {user.email}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: tac('role', language),
            key: 'role',
            width: 150,
            render: (_value: unknown, user) => (
                <Tag color={roleColor(user.role_code)}>
                    {roleLabel(
                        user.role_code,
                        roleByCode,
                        tac('unassignedRole', language),
                    )}
                </Tag>
            ),
        },
        {
            title: tac('status', language),
            key: 'status',
            width: 130,
            render: (_value: unknown, user) => (
                <Tag color={user.is_active ? 'green' : 'red'}>
                    {user.is_active
                        ? tac('active', language)
                        : tac('locked', language)}
                </Tag>
            ),
        },
        // {
        //     title: 'Quyền hiệu lực',
        //     key: 'permissions',
        //     width: 150,
        //     render: (_value: unknown, user) => {

        //         const count = user.role_code
        //             ? permissionCountByRole.get(user.role_code) ?? 0
        //             : 0;

        //         return `${count} quyền`;
        //     },
        // },
        {
            title: tac('actions', language),
            key: 'actions',
            width: 165,
            render: (_value: unknown, user) => (
                <div className={styles.userActionCell}>
                    <Button
                        className={styles.changeRoleButton}
                        icon={<SafetyCertificateOutlined />}
                        size="small"
                        disabled={
                            loadingStaffRoles ||
                            Boolean(staffRolesErrorMessage)
                        }
                        onClick={() => setSelectedUser(user)}
                    >
                        {tac('managePermissions', language)}
                    </Button>

                    <UserActionsMenu
                        user={user}
                        onEditInfo={() => setEditingUser(user)}
                        onChangePassword={() => setPasswordUser(user)}
                        onChanged={refreshUsersAndAuditLogs}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className={styles.userDirectory}>
            <div className={styles.userToolbar}>
                <Input.Search
                    allowClear
                    placeholder={tac('searchUsers', language)}
                    value={keywordInput}
                    onChange={(event) => {
                        setKeywordInput(event.target.value);
                    }}
                    onSearch={() => {
                        setKeyword(keywordInput);
                        setPage(1);
                    }}
                />

                <Select<UserListRoleFilter>
                    value={roleFilter}
                    options={roleFilterOptions}
                    onChange={(value) => {
                        setRoleFilter(value);
                        setPage(1);
                    }}
                />

                <Select<UserListStatusFilter>
                    value={statusFilter}
                    options={[
                        { value: 'all', label: tac('allStatuses', language) },
                        { value: 'active', label: tac('active', language) },
                        { value: 'inactive', label: tac('locked', language) },
                    ]}
                    onChange={(value) => {
                        setStatusFilter(value);
                        setPage(1);
                    }}
                />

                <Button
                    className={styles.createUserButton}
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={
                        loadingStaffRoles ||
                        Boolean(staffRolesErrorMessage) ||
                        activeUserRoleOptions.length === 0
                    }
                    onClick={() => setIsCreateDrawerOpen(true)}
                >
                    {tac('addNewUser', language)}
                </Button>
            </div>

            {errorMessage && (
                <Alert
                    showIcon
                    type="error"
                    title={tac('loadUsersFailed', language)}
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshUsers()}
                        >
                            {tac('retry', language)}
                        </Button>
                    }
                />
            )}

            {staffRolesErrorMessage && (
                <Alert
                    showIcon
                    type="error"
                    title={tac('loadRolesFailed', language)}
                    description={staffRolesErrorMessage}
                />
            )}

            <Table<AccessControlUser>
                rowKey="user_id"
                columns={columns}
                dataSource={data?.items ?? []}
                loading={isLoading}
                scroll={{ x: 850 }}
                pagination={{
                    current: data?.page ?? page,
                    pageSize: data?.pageSize ?? pageSize,
                    total: data?.totalCount ?? 0,
                    showSizeChanger: false,
                }}
                onChange={(pagination) => {
                    setPage(pagination.current ?? 1);
                    setPageSize(pagination.pageSize ?? 10);
                }}
            />

            <UserAccessDrawer
                key={
                    selectedUser
                        ? `access-${selectedUser.user_id}`
                        : 'access-drawer-closed'
                }
                user={selectedUser}
                roles={userRoleOptions}
                saving={savingRole}
                onClose={() => setSelectedUser(null)}
                onSave={handleSaveRole}
            />
            <UserEditDrawer
                key={
                    editingUser
                        ? `edit-${editingUser.user_id}`
                        : 'edit-drawer-closed'
                }
                user={editingUser}
                saving={savingEdit}
                onClose={() => setEditingUser(null)}
                onSave={handleSaveDisplayName}
            />
            <UserPasswordDrawer
                key={
                    passwordUser
                        ? `password-${passwordUser.user_id}`
                        : 'password-drawer-closed'
                }
                user={passwordUser}
                saving={savingPassword}
                onClose={() => setPasswordUser(null)}
                onSave={handleSavePassword}
            />
            <UserCreateDrawer
                open={isCreateDrawerOpen}
                roles={activeUserRoleOptions}
                saving={savingCreate}
                onClose={() => setIsCreateDrawerOpen(false)}
                onCreate={handleCreateUser}
            />
        </div>
    );
}
