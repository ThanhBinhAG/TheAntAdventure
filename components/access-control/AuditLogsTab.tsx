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
    getAccessControlErrorMessage,
    type AccessControlAuditLog,
} from './access-control-api';
import {
    getAccessControlAuditActionPresentation,
} from '@/lib/access-control/audit-log-presentation';
import { formatAccessControlDateTime } from '@/lib/access-control/format-datetime';
import styles from './AccessControlPage.module.css';
import {
    ACCESS_CONTROL_AUDIT_LOGS_KEY,
} from './useRefreshAccessControlAuditLogs';
import { useLanguage } from '@/hooks/useLanguage';
import {
    tac,
    tacTemplate,
} from '@/lib/i18n/pages/access-control';
import type { AppLanguage } from '@/lib/i18n/stages';

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

function readArrayLength(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
}

/** Các action này thay đổi role, nên không có target user để hiển thị. */
const STAFF_ROLE_ACTIONS = new Set([
    'staff_role_created',
    'staff_role_updated',
    'staff_role_deleted',
    'staff_role_permissions_replaced',
    'staff_role_resource_scopes_replaced',
]);

const CORE_RECORD_ACCESS_ACTIONS = new Set([
    'core_record_owner_reassigned',
    'core_record_assignee_changed',
]);

/** Đổi mã role kỹ thuật thành nhãn dễ đọc trong lịch sử. */
function getRoleLabel(
    roleCode: string | null,
    language: AppLanguage,
): string {
    if (!roleCode) return tac('noRoleAssigned', language);

    if (roleCode === 'super_admin') return 'Super Admin';
    if (roleCode === 'admin') return 'Admin';
    if (roleCode === 'employee') return tac('employeeRole', language);

    // Role động (Sale, Điều hành...) được lưu bằng code riêng trong audit.
    // Không có bảng role đi kèm log cũ, nên giữ code làm phương án dự phòng.
    return roleCode;
}

/** Lấy tên role từ dữ liệu audit; log cũ không có label sẽ dùng role_code. */
function getAuditRoleLabel(
    log: AccessControlAuditLog,
    language: AppLanguage,
): string {
    return (
        readString(log.afterValue.label) ??
        readString(log.beforeValue.label) ??
        getRoleLabel(
            readString(log.afterValue.role_code) ??
            readString(log.beforeValue.role_code),
            language,
        )
    );
}

/** Hiển thị tên hoặc email của user là đối tượng bị thay đổi. */
function getUserTarget(
    log: AccessControlAuditLog,
    language: AppLanguage,
): string {
    return (
        log.targetDisplayName ??
        log.targetEmail ??
        tac('deletedUser', language)
    );
}

/** Permission không thuộc một user cụ thể, mà thuộc danh mục quyền. */
function getPermissionCatalogTarget(language: AppLanguage): string {
    return tac('permissionCatalog', language);
}

function getCreatedPermissionLabel(
    log: AccessControlAuditLog,
    language: AppLanguage,
): string {
    return (
        readString(log.afterValue.permission_description) ??
        readString(log.afterValue.permission_code) ??
        tac('unknownFeature', language)
    );
}

function getCreatedPermissionGroupLabel(
    log: AccessControlAuditLog,
    language: AppLanguage,
): string {
    return (
        readString(log.afterValue.group_label) ??
        readString(log.afterValue.group_code) ??
        tac('unknownGroup', language)
    );
}

/** Lấy đối tượng thay đổi: user hoặc role tùy action audit. */
function getAuditTarget(log: AccessControlAuditLog, language: AppLanguage): string {
    if (log.action === 'permission_created') {
        return getPermissionCatalogTarget(language);
    }
    if (
        log.action === 'role_permissions_replaced' ||
        STAFF_ROLE_ACTIONS.has(log.action)
    ) {
        return tacTemplate('roleTarget', language, {
            role: getAuditRoleLabel(log, language),
        });
    }
    if (CORE_RECORD_ACCESS_ACTIONS.has(log.action)) {
        const resourceCode = readString(log.afterValue.resource_code) ??
            readString(log.beforeValue.resource_code) ??
            tac('unknown', language);
        const recordId = readString(log.afterValue.record_id) ??
            readString(log.beforeValue.record_id) ??
            tac('unknown', language);

        return `${resourceCode}: ${recordId}`;
    }

    return getUserTarget(log, language);
}

/** Tạo câu tóm tắt ngắn phù hợp với từng action audit. */
function getAuditSummary(log: AccessControlAuditLog, language: AppLanguage): string {
    if (log.action === 'permission_created') {
        return tacTemplate('permissionAddedToGroup', language, {
            permission: getCreatedPermissionLabel(log, language),
            group: getCreatedPermissionGroupLabel(log, language),
        });
    }
    if (log.action === 'staff_role_created') {
        return tacTemplate('roleCreatedSummary', language, {
            role: getAuditRoleLabel(log, language),
        });
    }

    if (log.action === 'staff_role_updated') {
        return log.afterValue.is_active === false
            ? tacTemplate('roleDeactivatedSummary', language, {
                role: getAuditRoleLabel(log, language),
            })
            : tacTemplate('roleUpdatedSummary', language, {
                role: getAuditRoleLabel(log, language),
            });
    }

    if (log.action === 'staff_role_deleted') {
        return tacTemplate('roleDeletedSummary', language, {
            role: getAuditRoleLabel(log, language),
        });
    }

    if (log.action === 'staff_role_permissions_replaced') {
        const oldCount = readStringArray(
            log.beforeValue.permission_codes,
        ).length;
        const newCount = readStringArray(
            log.afterValue.permission_codes,
        ).length;

        return tacTemplate('permissionCountChanged', language, {
            oldCount,
            newCount,
        });
    }

    if (log.action === 'staff_role_resource_scopes_replaced') {
        const oldCount = readArrayLength(log.beforeValue.scopes);
        const newCount = readArrayLength(log.afterValue.scopes);

        return tacTemplate('scopeCountChanged', language, {
            oldCount,
            newCount,
        });
    }

    if (log.action === 'user_role_changed') {
        return `${getRoleLabel(
            readString(log.beforeValue.role_code),
            language,
        )} → ${getRoleLabel(
            readString(log.afterValue.role_code),
            language,
        )}`;
    }

    if (log.action === 'user_profile_updated') {
        const oldName = readString(log.beforeValue.display_name);
        const newName = readString(log.afterValue.display_name);

        return tacTemplate('displayNameChanged', language, {
            oldName: oldName ?? tac('unnamedUser', language),
            newName: newName ?? tac('unnamedUser', language),
        });
    }

    if (log.action === 'role_permissions_replaced') {
        const oldCount = readStringArray(
            log.beforeValue.permission_codes,
        ).length;
        const newCount = readStringArray(
            log.afterValue.permission_codes,
        ).length;

        return tacTemplate('permissionCountChanged', language, {
            oldCount,
            newCount,
        });
    }

    return getAccessControlAuditActionPresentation(
        log.action,
        language,
    ).label;
}

/** Hiển thị chi tiết cũ/mới khi người dùng mở rộng một dòng log. */
function AuditLogDetails({
    log,
    language,
}: {
    log: AccessControlAuditLog;
    language: AppLanguage;
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

    if (log.action === 'permission_created') {
        const permissionCode = readString(
            log.afterValue.permission_code,
        );

        return (
            <div className={styles.auditDetails}>
                <span>
                    {tac('feature', language)}:{' '}
                    <strong>
                        {getCreatedPermissionLabel(log, language)}
                    </strong>
                </span>

                <span>
                    {tac('featureGroup', language)}:{' '}
                    <strong>
                        {getCreatedPermissionGroupLabel(log, language)}
                    </strong>
                </span>

                {permissionCode && (
                    <span>
                        {tac('internalPermissionCode', language)}:{' '}
                        <code>{permissionCode}</code>
                    </span>
                )}
            </div>
        );
    }

    if (log.action === 'user_role_changed') {
        return (
            <div className={styles.auditDetails}>
                <span>
                    {tac('oldRole', language)}:{' '}
                    <strong>{getRoleLabel(oldRole, language)}</strong>
                </span>

                <span>
                    {tac('newRole', language)}:{' '}
                    <strong>{getRoleLabel(newRole, language)}</strong>
                </span>
            </div>
        );
    }

    if (log.action === 'user_profile_updated') {
        return (
            <div className={styles.auditDetails}>
                <span>
                    {tac('oldName', language)}:{' '}
                    <strong>
                        {readString(log.beforeValue.display_name) ??
                            tac('unnamedUser', language)}
                    </strong>
                </span>

                <span>
                    {tac('newName', language)}:{' '}
                    <strong>
                        {readString(log.afterValue.display_name) ??
                            tac('unnamedUser', language)}
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
                        language,
                    ).label}
                </span>

                {roleCode && (
                    <span>
                        {tac('roleAtAction', language)}:{' '}
                        <strong>{getRoleLabel(roleCode, language)}</strong>
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={styles.auditDetails}>
            <span>
                {tac('updatedRole', language)}:{' '}
                <strong>{getAuditRoleLabel(log, language)}</strong>
            </span>

            <div>
                <strong>{tac('addedPermissions', language)}:</strong>

                <div className={styles.auditCodeList}>
                    {addedPermissions.length > 0
                        ? addedPermissions.map((code) => (
                            <code key={code}>{code}</code>
                        ))
                        : tac('none', language)}
                </div>
            </div>

            <div>
                <strong>{tac('removedPermissions', language)}:</strong>

                <div className={styles.auditCodeList}>
                    {removedPermissions.length > 0
                        ? removedPermissions.map((code) => (
                            <code key={code}>{code}</code>
                        ))
                        : tac('none', language)}
                </div>
            </div>
        </div>
    );
}

export default function AuditLogsTab() {
    const { language } = useLanguage();
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
        error
            ? getAccessControlErrorMessage(
                error,
                language,
                'loadAuditLogsFailed',
            )
            : null;

    const columns: TableColumnsType<AccessControlAuditLog> = [
        {
            title: tac('time', language),
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatAccessControlDateTime(value, language),
        },
        {
            title: tac('activity', language),
            dataIndex: 'action',
            width: 180,
            render: (value: string) => (
                <Tag
                    color={getAccessControlAuditActionPresentation(
                        value,
                        language,
                    ).color}
                >
                    {getAccessControlAuditActionPresentation(
                        value,
                        language,
                    ).label}
                </Tag>
            ),
        },
        {
            title: tac('actor', language),
            key: 'actor',
            render: (_value: unknown, log) => (
                <div>
                    <strong>
                        {log.actorDisplayName ??
                            log.actorEmail ??
                            tac('unknown', language)}
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
            title: tac('target', language),
            key: 'target',
            render: (_value: unknown, log) => getAuditTarget(log, language),
        },
        {
            title: tac('summary', language),
            key: 'summary',
            render: (_value: unknown, log) => getAuditSummary(log, language),
        },
    ];

    return (
        <div className={styles.auditTab}>
            <header className={styles.auditHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>
                        {tac('changeHistoryList', language)}
                    </h2>
                </div>
            </header>

            {errorMessage && (
                <Alert
                    type="error"
                    showIcon
                    title={tac('unableToLoadHistory', language)}
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshLogs()}
                        >
                            {tac('retry', language)}
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
                    emptyText: tac('noChangesYet', language),
                }}
                expandable={{
                    expandedRowRender: (log) => (
                        <AuditLogDetails log={log} language={language} />
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
