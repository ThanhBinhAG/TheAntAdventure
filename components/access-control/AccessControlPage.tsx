'use client';

/**
 * Trang Quản lý người dùng & phân quyền.
 *
 * Chức năng:
 * - Lấy role và permission từ GET /api/access-control.
 * - Lấy danh sách user phân trang từ /api/access-control/users.
 * - Lấy lịch sử thay đổi từ /api/access-control/audit-logs.
 * - Gửi yêu cầu đổi role hoặc cập nhật permission.
 */

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import {
    HistoryOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import {
    Tabs,
} from 'antd';
import AccessControlUiProvider from './AccessControlUiProvider';
import UserDirectory from './UserDirectory';
import {
    fetchAccessControlData,
    updateRolePermissions,
} from './access-control-api';
import styles from './AccessControlPage.module.css';
import RolesPermissionsTab from './RolesPermissionsTab';
import AuditLogsTab from './AuditLogsTab';

export default function AccessControlPage() {

    /**
 * SWR lưu dữ liệu trong RAM của trình duyệt.
 *
 * - Không lưu role/permission vào localStorage.
 * - Trong 60 giây, tránh gọi trùng API khi component render lại.
 * - Khi quay lại tab trình duyệt, SWR sẽ kiểm tra dữ liệu mới.
 */
    /**
 * Chỉ mở component lịch sử khi người quản trị thật sự bấm tab.
 * Tránh gọi API audit-logs ngay khi mới vào Access Control.
 */
    const [hasOpenedAuditLogs, setHasOpenedAuditLogs] = useState(false);

    const {
        data,
        error,
        isLoading,
        mutate,
    } = useSWR(
        'access-control/roles-permissions',
        fetchAccessControlData,
        {
            // Dữ liệu chỉ tải lại sau thao tác lưu hoặc khi bấm nút tải lại.
            // Không gọi API lại chỉ vì người dùng quay về tab trình duyệt.
            dedupingInterval: 60_000,
            revalidateOnFocus: false,
            focusThrottleInterval: 30_000,
            revalidateOnReconnect: true,
        },
    );

    /** Ép SWR tải lại dữ liệu sau khi Super Admin vừa lưu permission. */
    const reloadData = useCallback(async (): Promise<void> => {
        await mutate();
    }, [mutate]);

    /** Đổi lỗi kỹ thuật thành text để giao diện hiển thị an toàn. */
    const errorMessage =
        error instanceof Error
            ? error.message
            : error
                ? 'Không thể tải dữ liệu phân quyền.'
                : null;

    return (
        <AccessControlUiProvider>
            <div className={styles.page}>

                <section className={styles.content}>
                    <Tabs
                        onChange={(activeKey) => {
                            if (activeKey === 'audit-logs') {
                                setHasOpenedAuditLogs(true);
                            }
                        }}
                        items={[
                            {
                                key: 'users',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <TeamOutlined />
                                        Người dùng
                                    </span>
                                ),
                                children: (
                                    <UserDirectory
                                        roles={data?.roles ?? []}
                                        permissions={data?.permissions ?? []}
                                    />
                                ),
                            },
                            {
                                key: 'roles',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <SafetyCertificateOutlined />
                                        Role & quyền
                                    </span>
                                ),
                                children: (
                                    <RolesPermissionsTab
                                        roles={data?.roles ?? []}
                                        permissions={data?.permissions ?? []}
                                        loading={isLoading}
                                        error={errorMessage}
                                        onRetry={reloadData}
                                        onRoleChanged={reloadData}
                                        onUpdatePermissions={updateRolePermissions}
                                    />
                                ),
                            },
                            {
                                key: 'audit-logs',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <HistoryOutlined />
                                        Lịch sử thay đổi
                                    </span>
                                ),
                                children: hasOpenedAuditLogs ? <AuditLogsTab /> : null,
                            },
                        ]}
                    />
                </section>
            </div>
        </AccessControlUiProvider>
    );
}
