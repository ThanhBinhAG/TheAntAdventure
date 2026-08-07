'use client';

/**
 * Trang Quản lý người dùng và phân quyền.
 *
 * Chức năng:
 * - Tab Người dùng chỉ tải users và role có thể gán.
 * - Tab Role & quyền mới tải catalog permission khi được mở.
 * - Tab Lịch sử chỉ tải audit log khi được mở.
 *
 * Mục đích:
 * - Không tải dữ liệu chưa cần dùng khi mới vào Access Control.
 * - Mỗi tab tự chịu trách nhiệm tải dữ liệu của chính nó.
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
    HistoryOutlined,
    LoginOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { tac } from '@/lib/i18n/pages/access-control';
import {
    fetchAccessControlSuperAdminStatus,
} from './access-control-api';
import LoginHistoryTab from './LoginHistoryTab';
import { Tabs } from 'antd';
import AccessControlUiProvider from './AccessControlUiProvider';
import UserDirectory from './UserDirectory';
import styles from './AccessControlPage.module.css';
import RolesPermissionsTab from './RolesPermissionsTab';
import AuditLogsTab from './AuditLogsTab';

export default function AccessControlPage() {
    const { language } = useLanguage();

    // Chỉ mount tab nặng sau lần người dùng thật sự mở nó.
    const [hasOpenedRoles, setHasOpenedRoles] = useState(false);
    const [hasOpenedAuditLogs, setHasOpenedAuditLogs] = useState(false);
    const [hasOpenedLoginHistory, setHasOpenedLoginHistory] =
        useState(false);

    const {
        data: superAdminStatus,
        isValidating: validatingSuperAdminStatus,
    } = useSWR(
        'access-control/super-admin-status',
        fetchAccessControlSuperAdminStatus,
        {
            // Không dùng cache Super Admin của session đăng nhập trước.
            revalidateOnMount: true,
            dedupingInterval: 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        },
    );

    // Trong lúc API đang xác nhận, mặc định ẩn tab để Admin không thấy nhầm.
    const canViewLoginHistory =
        !validatingSuperAdminStatus &&
        superAdminStatus?.isSuperAdmin === true;

    return (
        <AccessControlUiProvider>
            <div className={styles.page}>
                <section className={styles.content}>
                    <Tabs
                        onChange={(activeKey) => {
                            if (activeKey === 'roles') {
                                setHasOpenedRoles(true);
                            }

                            if (activeKey === 'audit-logs') {
                                setHasOpenedAuditLogs(true);
                            }
                            if (activeKey === 'login-history') {
                                setHasOpenedLoginHistory(true);
                            }
                        }}
                        items={[
                            {
                                key: 'users',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <TeamOutlined />
                                        {tac('users', language)}
                                    </span>
                                ),
                                children: <UserDirectory />,
                            },
                            {
                                key: 'roles',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <SafetyCertificateOutlined />
                                        {tac('rolesAndPermissions', language)}
                                    </span>
                                ),
                                children: hasOpenedRoles
                                    ? <RolesPermissionsTab />
                                    : null,
                            },
                            {
                                key: 'audit-logs',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <HistoryOutlined />
                                        {tac('changeHistory', language)}
                                    </span>
                                ),
                                children: hasOpenedAuditLogs
                                    ? <AuditLogsTab />
                                    : null,
                            },
                            ...(canViewLoginHistory
                                ? [
                                    {
                                        key: 'login-history',
                                        label: (
                                            <span className={styles.tabLabel}>
                                                <LoginOutlined />
                                                {tac('loginHistory', language)}
                                            </span>
                                        ),
                                        children: hasOpenedLoginHistory
                                            ? <LoginHistoryTab />
                                            : null,
                                    },
                                ]
                                : []),
                        ]}
                    />
                </section>
            </div>
        </AccessControlUiProvider>
    );
}
