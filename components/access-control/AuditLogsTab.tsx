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

import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { ReloadOutlined } from '@ant-design/icons';
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
    type AccessControlAuditLogsPage,
} from './access-control-api';
import {
    getAccessControlAuditActionPresentation,
} from '@/lib/access-control/audit-log-presentation';
import styles from './AccessControlPage.module.css';

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

/** Đổi mã role kỹ thuật thành nhãn dễ đọc trong lịch sử. */
function getRoleLabel(roleCode: string | null): string {
    if (roleCode === 'super_admin') return 'Super Admin';
    if (roleCode === 'admin') return 'Admin';
    if (roleCode === 'employee') return 'Nhân viên';

    return 'Chưa gán role';
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
    if (log.action === 'role_permissions_replaced') {
        return `Role: ${getRoleLabel(
            readString(log.afterValue.role_code),
        )}`;
    }

    return getUserTarget(log);
}

/** Tạo câu tóm tắt ngắn phù hợp với từng action audit. */
function getAuditSummary(log: AccessControlAuditLog): string {
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

    if (log.action !== 'role_permissions_replaced') {
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
                <strong>
                    {readString(log.afterValue.role_code) ?? 'Không xác định'}
                </strong>
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
    const [data, setData] =
        useState<AccessControlAuditLogsPage | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(true);
    const [error, setError] =
        useState<string | null>(null);

    /** Tải một trang log từ API. */
    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const nextData = await fetchAccessControlAuditLogs({
                page,
                pageSize,
            });

            setData(nextData);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải lịch sử phân quyền.',
            );
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        let cancelled = false;

        // Chạy sau khi effect hoàn tất để không setState đồng bộ trong effect.
        void Promise.resolve().then(() => {
            if (!cancelled) {
                return loadLogs();
            }

            return undefined;
        });

        return () => {
            cancelled = true;
        };
    }, [loadLogs]);

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

                <Button
                    icon={<ReloadOutlined />}
                    loading={loading}
                    onClick={() => void loadLogs()}
                >
                    Tải lại
                </Button>
            </header>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải lịch sử"
                    description={error}
                    action={
                        <Button
                            size="small"
                            onClick={() => void loadLogs()}
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
                loading={loading}
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
