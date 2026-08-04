'use client';

/**
 * Tab hiển thị lịch sử thay đổi phân quyền.
 *
 * Chức năng:
 * - Tải log theo trang từ API.
 * - Hiển thị người thực hiện, đối tượng thay đổi và thời gian.
 * - Giải thích rõ thay đổi role, permission và vòng đời tài khoản.
 *
 * Lưu ý:
 * - Tab chỉ đọc dữ liệu.
 * - API và database đã kiểm tra users.manage trước khi trả log.
 */

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import {
    Alert,
    Button,
    Table,
    Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    fetchAccessControlAuditLogs,
    type AccessControlAuditLog,
} from './access-control-api';
import {
    getAccessControlAuditActionPresentation,
} from '@/lib/access-control/audit-log-presentation';
import styles from './AccessControlPage.module.css';
import {
    ACCESS_CONTROL_AUDIT_LOGS_KEY,
} from './useRefreshAccessControlAuditLogs';

/** Lấy chuỗi từ JSON audit một cách an toàn. */
function readString(
    value: unknown,
): string | null {
    return typeof value === 'string' ? value : null;
}

/** Lấy mảng string từ JSON audit một cách an toàn. */
function readStringArray(
    value: unknown,
): string[] {
    if (!Array.isArray(value)) return [];

    return value.filter(
        (item): item is string => typeof item === 'string',
    );
}

/** Các action này thay đổi role, nên không có target user để hiển thị. */
const STAFF_ROLE_ACTIONS = new Set([
    'staff_role_created',
    'staff_role_updated',
    'staff_role_permissions_replaced',
]);

/** Đổi mã role kỹ thuật thành nhãn dễ đọc trong lịch sử. */
function getRoleLabel(roleCode: string | null): string {
    if (!roleCode) return 'Chưa gán role';

    if (roleCode === 'super_admin') return 'Super Admin';
    if (roleCode === 'admin') return 'Admin';
    if (roleCode === 'employee') return 'Nhân viên';

    // Role động (Sale, Điều hành...) được lưu bằng code riêng trong audit.
    // Không có bảng role đi kèm log cũ, nên giữ code làm phương án dự phòng.
    return roleCode;
}

/** Lấy tên role từ dữ liệu audit; log cũ không có label sẽ dùng role_code. */
function getAuditRoleLabel(log: AccessControlAuditLog): string {
    return (
        readString(log.afterValue.label) ??
        readString(log.beforeValue.label) ??
        getRoleLabel(
            readString(log.afterValue.role_code) ??
            readString(log.beforeValue.role_code),
        )
    );
}

/** Hiển thị tên hoặc email của user là đối tượng bị thay đổi. */
function getUserTarget(log: AccessControlAuditLog): string {
    return (
        log.targetDisplayName ??
        log.targetEmail ??
        'Người dùng không còn tồn tại'
    );
}

/** Lấy đối tượng thay đổi: user hoặc role tùy action audit. */
function getAuditTarget(log: AccessControlAuditLog): string {
    if (
        log.action === 'role_permissions_replaced' ||
        STAFF_ROLE_ACTIONS.has(log.action)
    ) {
        return `Role: ${getAuditRoleLabel(log)}`;
    }

    return getUserTarget(log);
}

/** Tạo câu tóm tắt ngắn phù hợp với từng action audit. */
function getAuditSummary(log: AccessControlAuditLog): string {
    if (log.action === 'staff_role_created') {
        return `Đã tạo role ${getAuditRoleLabel(log)}.`;
    }

    if (log.action === 'staff_role_updated') {
        return log.afterValue.is_active === false
            ? `Đã ngừng sử dụng role ${getAuditRoleLabel(log)}.`
            : `Đã cập nhật role ${getAuditRoleLabel(log)}.`;
    }

    if (log.action === 'staff_role_permissions_replaced') {
        const oldCount = readStringArray(
            log.beforeValue.permission_codes,
        ).length;
        const newCount = readStringArray(
            log.afterValue.permission_codes,
        ).length;

        return `${oldCount} quyền → ${newCount} quyền`;
    }

    if (log.action === 'user_role_changed') {
        return `${getRoleLabel(
            readString(log.beforeValue.role_code),
        )} → ${getRoleLabel(
            readString(log.afterValue.role_code),
        )}`;
    }

    if (log.action === 'user_profile_updated') {
        const oldName = readString(log.beforeValue.display_name);
        const newName = readString(log.afterValue.display_name);

        return `${oldName ?? 'Chưa đặt tên'} → ${newName ?? 'Chưa đặt tên'
            }`;
    }

    if (log.action === 'role_permissions_replaced') {
        const oldCount = readStringArray(
            log.beforeValue.permission_codes,
        ).length;
        const newCount = readStringArray(
            log.afterValue.permission_codes,
        ).length;

        return `${oldCount} quyền → ${newCount} quyền`;
    }

    return getAccessControlAuditActionPresentation(
        log.action,
    ).label;
}

/** Định dạng thời gian theo ngôn ngữ Việt Nam. */
function formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

/** Hiển thị chi tiết cũ/mới khi người dùng mở rộng một dòng log. */
function AuditLogDetails({
    log,
}: {
    log: AccessControlAuditLog;
}) {
    const oldRole = readString(log.beforeValue.role_code);
    const newRole = readString(log.afterValue.role_code);

    const oldPermissions = readStringArray(
        log.beforeValue.permission_codes,
    );
    const newPermissions = readStringArray(
        log.afterValue.permission_codes,
    );

    const addedPermissions = newPermissions.filter(
        (code) => !oldPermissions.includes(code),
    );

    const removedPermissions = oldPermissions.filter(
        (code) => !newPermissions.includes(code),
    );

    const isPermissionReplacement =
        log.action === 'role_permissions_replaced' ||
        log.action === 'staff_role_permissions_replaced';

    if (log.action === 'user_role_changed') {
        return (
            <div className={styles.auditDetails}>
                <span>
                    Role cũ: <strong>{oldRole ?? 'Chưa gán role'}</strong>
                </span>

                <span>
                    Role mới: <strong>{newRole ?? 'Chưa gán role'}</strong>
                </span>
            </div>
        );
    }

    if (log.action === 'user_profile_updated') {
        return (
            <div className={styles.auditDetails}>
                <span>
                    Tên cũ:{' '}
                    <strong>
                        {readString(log.beforeValue.display_name) ??
                            'Chưa đặt tên'}
                    </strong>
                </span>

                <span>
                    Tên mới:{' '}
                    <strong>
                        {readString(log.afterValue.display_name) ??
                            'Chưa đặt tên'}
                    </strong>
                </span>
            </div>
        );
    }

    if (!isPermissionReplacement) {
        const roleCode = readString(log.afterValue.role_code);

        return (
            <div className={styles.auditDetails}>
                <span>
                    {getAccessControlAuditActionPresentation(
                        log.action,
                    ).label}
                </span>

                {roleCode && (
                    <span>
                        Role tại thời điểm thao tác:{' '}
                        <strong>{getRoleLabel(roleCode)}</strong>
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={styles.auditDetails}>
            <span>
                Role được cập nhật:{' '}
                <strong>{getAuditRoleLabel(log)}</strong>
            </span>

            <div>
                <strong>Quyền được thêm:</strong>

                <div className={styles.auditCodeList}>
                    {addedPermissions.length > 0
                        ? addedPermissions.map((code) => (
                            <code key={code}>{code}</code>
                        ))
                        : 'Không có'}
                </div>
            </div>

            <div>
                <strong>Quyền bị bỏ:</strong>

                <div className={styles.auditCodeList}>
                    {removedPermissions.length > 0
                        ? removedPermissions.map((code) => (
                            <code key={code}>{code}</code>
                        ))
                        : 'Không có'}
                </div>
            </div>
        </div>
    );
}

export default function AuditLogsTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    /**
     * Cache RAM cho từng trang lịch sử.
     *
     * Ví dụ: trang 1 và trang 2 có cache riêng.
     * Khi quay lại trang vừa xem, SWR có thể dùng dữ liệu đã tải.
     */
    const auditLogsQueryKey = [
        ACCESS_CONTROL_AUDIT_LOGS_KEY,
        page,
        pageSize,
    ] as const;

    const {
        data,
        error,
        isLoading,
        mutate: reloadLogs,
    } = useSWR(
        auditLogsQueryKey,
        () => fetchAccessControlAuditLogs({ page, pageSize }),
        {
            // Audit log ít thay đổi hơn danh sách user.
            dedupingInterval: 30_000,
            keepPreviousData: true,
            revalidateOnFocus: false,
            focusThrottleInterval: 30_000,
            revalidateOnReconnect: true,
        },
    );

    /** Chỉ dùng khi API lỗi để người dùng yêu cầu tải lại trang log hiện tại. */
    const refreshLogs = useCallback(async (): Promise<void> => {
        await reloadLogs();
    }, [reloadLogs]);

    const errorMessage =
        error instanceof Error
            ? error.message
            : error
                ? 'Không thể tải lịch sử phân quyền.'
                : null;

    const columns: TableColumnsType<AccessControlAuditLog> = [
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatDateTime(value),
        },
        {
            title: 'Thao tác',
            dataIndex: 'action',
            width: 180,
            render: (value: string) => (
                <Tag
                    color={getAccessControlAuditActionPresentation(value).color}
                >
                    {getAccessControlAuditActionPresentation(value).label}
                </Tag>
            ),
        },
        {
            title: 'Người thực hiện',
            key: 'actor',
            render: (_value: unknown, log) => (
                <div>
                    <strong>
                        {log.actorDisplayName ??
                            log.actorEmail ??
                            'Không xác định'}
                    </strong>

                    {log.actorDisplayName && log.actorEmail && (
                        <div className={styles.userEmail}>
                            {log.actorEmail}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Đối tượng',
            key: 'target',
            render: (_value: unknown, log) => getAuditTarget(log),
        },
        {
            title: 'Tóm tắt',
            key: 'summary',
            render: (_value: unknown, log) => getAuditSummary(log),
        },
    ];

    return (
        <div className={styles.auditTab}>
            <header className={styles.auditHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>
                        Danh sách lịch sử thay đổi
                    </h2>
                </div>
            </header>

            {errorMessage && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải lịch sử"
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshLogs()}
                        >
                            Thử lại
                        </Button>
                    }
                />
            )}

            <Table<AccessControlAuditLog>
                rowKey="id"
                columns={columns}
                dataSource={data?.items ?? []}
                loading={isLoading}
                scroll={{ x: 900 }}
                locale={{
                    emptyText: 'Chưa có thay đổi phân quyền nào.',
                }}
                expandable={{
                    expandedRowRender: (log) => (
                        <AuditLogDetails log={log} />
                    ),
                    rowExpandable: () => true,
                }}
                pagination={{
                    current: data?.page ?? page,
                    pageSize: data?.pageSize ?? pageSize,
                    total: data?.totalCount ?? 0,
                    showSizeChanger: false,
                }}
                onChange={(pagination) => {
                    setPage(pagination.current ?? 1);
                    setPageSize(pagination.pageSize ?? 20);
                }}
            />
        </div>
    );
}
