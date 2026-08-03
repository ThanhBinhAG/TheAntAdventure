'use client';

/**
 * Danh sách user có thể mở rộng khi số nhân viên tăng.
 *
 * Chức năng:
 * - Tải user theo trang từ API.
 * - Tìm kiếm theo tên/email.
 * - Lọc theo role và trạng thái.
 * - Hiển thị thống kê user.
 * - Tạo tài khoản, sửa tên, đổi role, đổi trạng thái và xóa mềm.
 */

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
    SafetyCertificateOutlined,
    TeamOutlined,
    PlusOutlined,
    UserOutlined,
    UserSwitchOutlined,
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Input,
    Select,
    Statistic,
    Table,
    Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { toast } from '@/lib/toast';
import UserAccessDrawer from './UserAccessDrawer';
import {
    createAccessControlUser,
    fetchAccessControlUsersPage,
    updateUserRole,
    type AccessControlRole,
    type AccessControlUser,
    type CreateAccessControlUserInput,
    type ManagedRoleCode,
    type UserListRoleFilter,
    type UserListStatusFilter,
    type AccessControlPermission,
    updateUserDisplayName,
} from './access-control-api';
import styles from './AccessControlPage.module.css';
import UserActionsMenu from './UserActionsMenu';
import UserEditDrawer from './UserEditDrawer';
import UserCreateDrawer from './UserCreateDrawer';

type UserDirectoryProps = {
    roles: AccessControlRole[];
    permissions: AccessControlPermission[];
};

/** Đổi role kỹ thuật thành nhãn dễ đọc. */
function roleLabel(roleCode: ManagedRoleCode | null): string {
    if (roleCode === 'super_admin') return 'Super Admin';
    if (roleCode === 'admin') return 'Admin';
    if (roleCode === 'employee') return 'Nhân viên';

    return 'Chưa gán role';
}

/** Màu Tag tương ứng với role. */
function roleColor(roleCode: ManagedRoleCode | null): string {
    if (roleCode === 'super_admin') return 'gold';
    if (roleCode === 'admin') return 'green';
    if (roleCode === 'employee') return 'blue';

    return 'default';
}

export default function UserDirectory({
    roles,
    permissions,
}: UserDirectoryProps) {
    const [keywordInput, setKeywordInput] = useState('');
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] =
        useState<UserListRoleFilter>('all');
    const [statusFilter, setStatusFilter] =
        useState<UserListStatusFilter>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

            // Khi quay lại tab hoặc có mạng lại, kiểm tra dữ liệu mới.
            revalidateOnFocus: true,
            focusThrottleInterval: 30_000,
            revalidateOnReconnect: true,
        },
    );

    /** Làm mới danh sách đang xem sau các thao tác thay đổi dữ liệu. */
    const refreshUsers = useCallback(async (): Promise<void> => {
        await reloadUsers();
    }, [reloadUsers]);

    /** Đổi lỗi kỹ thuật của SWR thành text an toàn để hiển thị. */
    const errorMessage =
        error instanceof Error
            ? error.message
            : error
                ? 'Không thể tải danh sách user.'
                : null;

    const [selectedUser, setSelectedUser] =
        useState<AccessControlUser | null>(null);
    const [savingRole, setSavingRole] = useState(false);

    const [editingUser, setEditingUser] =
        useState<AccessControlUser | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const [isCreateDrawerOpen, setIsCreateDrawerOpen] =
        useState(false);
    const [savingCreate, setSavingCreate] = useState(false);

    /** Tổng số quyền của role, hiển thị ngắn gọn trong bảng. */
    const permissionCountByRole = useMemo(() => {
        return new Map(
            roles.map((role) => [
                role.role_code,
                role.permission_codes.length,
            ]),
        );
    }, [roles]);

    async function handleSaveRole(
        userId: string,
        roleCode: ManagedRoleCode,
    ) {
        setSavingRole(true);

        try {
            await updateUserRole(userId, roleCode);

            toast.success('Đã cập nhật role người dùng.');
            setSelectedUser(null);

            // Tải lại đúng trang đang xem để role mới hiển thị ngay.
            await refreshUsers();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật role người dùng.',
            );
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

            toast.success('Đã cập nhật thông tin người dùng.');
            setEditingUser(null);

            await refreshUsers();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật thông tin user.',
            );
        } finally {
            setSavingEdit(false);
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
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tạo tài khoản.',
            );

            // Drawer bắt lỗi này để giữ nguyên dữ liệu form cho người dùng sửa.
            throw error;
        } finally {
            setSavingCreate(false);
        }

        toast.success('Đã tạo tài khoản và gán role ban đầu.');
        setIsCreateDrawerOpen(false);

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
            title: 'Người dùng',
            key: 'user',
            render: (_value: unknown, user) => (
                <div>
                    <strong>
                        {user.display_name || user.email || 'Chưa đặt tên'}
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
            title: 'Role',
            key: 'role',
            width: 150,
            render: (_value: unknown, user) => (
                <Tag color={roleColor(user.role_code)}>
                    {roleLabel(user.role_code)}
                </Tag>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 130,
            render: (_value: unknown, user) => (
                <Tag color={user.is_active ? 'green' : 'red'}>
                    {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                </Tag>
            ),
        },
        {
            title: 'Quyền hiệu lực',
            key: 'permissions',
            width: 150,
            render: (_value: unknown, user) => {
                if (user.role_code === 'super_admin') {
                    return <Tag color="gold">Toàn quyền</Tag>;
                }

                const count = user.role_code
                    ? permissionCountByRole.get(user.role_code) ?? 0
                    : 0;

                return `${count} quyền`;
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 165,
            render: (_value: unknown, user) => (
                <div className={styles.userActionCell}>
                    <Button
                        className={styles.changeRoleButton}
                        icon={<SafetyCertificateOutlined />}
                        size="small"
                        onClick={() => setSelectedUser(user)}
                    >
                        Phân quyền
                    </Button>

                    <UserActionsMenu
                        user={user}
                        onEditInfo={() => setEditingUser(user)}
                        onChanged={refreshUsers}
                    />
                </div>
            ),
        },
    ];

    const summary = data?.summary;

    return (
        <div className={styles.userDirectory}>
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <Statistic
                        title="Tổng tài khoản"
                        value={summary?.totalUsers ?? 0}
                        prefix={<TeamOutlined />}
                    />
                </div>

                <div className={styles.summaryCard}>
                    <Statistic
                        title="Super Admin"
                        value={summary?.superAdminCount ?? 0}
                        prefix={<SafetyCertificateOutlined />}
                    />
                </div>

                <div className={styles.summaryCard}>
                    <Statistic
                        title="Admin"
                        value={summary?.adminCount ?? 0}
                        prefix={<UserSwitchOutlined />}
                    />
                </div>

                <div className={styles.summaryCard}>
                    <Statistic
                        title="Nhân viên"
                        value={summary?.employeeCount ?? 0}
                        prefix={<UserOutlined />}
                    />
                </div>
            </div>

            <div className={styles.userToolbar}>
                <Input.Search
                    allowClear
                    placeholder="Tìm theo tên hoặc email"
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
                    options={[
                        { value: 'all', label: 'Tất cả role' },
                        { value: 'super_admin', label: 'Super Admin' },
                        { value: 'admin', label: 'Admin' },
                        { value: 'employee', label: 'Nhân viên' },
                        { value: 'unassigned', label: 'Chưa gán role' },
                    ]}
                    onChange={(value) => {
                        setRoleFilter(value);
                        setPage(1);
                    }}
                />

                <Select<UserListStatusFilter>
                    value={statusFilter}
                    options={[
                        { value: 'all', label: 'Mọi trạng thái' },
                        { value: 'active', label: 'Hoạt động' },
                        { value: 'inactive', label: 'Đã khóa' },
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
                    disabled={roles.length === 0}
                    onClick={() => setIsCreateDrawerOpen(true)}
                >
                    Thêm người dùng mới
                </Button>
            </div>

            {errorMessage && (
                <Alert
                    showIcon
                    type="error"
                    message="Không thể tải danh sách user"
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshUsers()}
                        >
                            Thử lại
                        </Button>
                    }
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
                key={selectedUser?.user_id ?? 'no-user-selected'}
                user={selectedUser}
                roles={roles}
                permissions={permissions}
                saving={savingRole}
                onClose={() => setSelectedUser(null)}
                onSave={handleSaveRole}
            />
            <UserEditDrawer
                key={editingUser?.user_id ?? 'no-user-selected'}
                user={editingUser}
                saving={savingEdit}
                onClose={() => setEditingUser(null)}
                onSave={handleSaveDisplayName}
            />
            <UserCreateDrawer
                open={isCreateDrawerOpen}
                roles={roles}
                saving={savingCreate}
                onClose={() => setIsCreateDrawerOpen(false)}
                onCreate={handleCreateUser}
            />
        </div>
    );
}
