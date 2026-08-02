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

import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import {
    HistoryOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import {
    Tabs,
    Tag,
} from 'antd';
import AccessControlUiProvider from './AccessControlUiProvider';
import UserDirectory from './UserDirectory';
import {
    fetchAccessControlData,
    updateRolePermissions,
    type AccessControlData,
} from './access-control-api';
import styles from './AccessControlPage.module.css';
import RolesPermissionsTab from './RolesPermissionsTab';
import AuditLogsTab from './AuditLogsTab';

export default function AccessControlPage() {
    const [data, setData] =
        useState<AccessControlData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] =
        useState<string | null>(null);

    /** Tải dữ liệu quản trị từ API. */
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const nextData = await fetchAccessControlData();
            setData(nextData);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Không thể tải dữ liệu phân quyền.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Khi Super Admin mở trang, tải dữ liệu lần đầu.
    useEffect(() => {
        void loadData();
    }, [loadData]);

    return (
        <AccessControlUiProvider>
            <div className={styles.page}>

                <section className={styles.content}>
                    <Tabs
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
                                        loading={loading}
                                        error={error}
                                        onRetry={loadData}
                                        onRoleChanged={loadData}
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
                                children: <AuditLogsTab />,
                            },
                        ]}
                    />
                </section>
            </div>
        </AccessControlUiProvider>
    );
}