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
import {
    HistoryOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { Tabs } from 'antd';
import AccessControlUiProvider from './AccessControlUiProvider';
import UserDirectory from './UserDirectory';
import styles from './AccessControlPage.module.css';
import RolesPermissionsTab from './RolesPermissionsTab';
import AuditLogsTab from './AuditLogsTab';

export default function AccessControlPage() {
    // Chỉ mount tab nặng sau lần người dùng thật sự mở nó.
    const [hasOpenedRoles, setHasOpenedRoles] = useState(false);
    const [hasOpenedAuditLogs, setHasOpenedAuditLogs] = useState(false);

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
                                children: <UserDirectory />,
                            },
                            {
                                key: 'roles',
                                label: (
                                    <span className={styles.tabLabel}>
                                        <SafetyCertificateOutlined />
                                        Role & quyền
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
                                        Lịch sử thay đổi
                                    </span>
                                ),
                                children: hasOpenedAuditLogs
                                    ? <AuditLogsTab />
                                    : null,
                            },
                        ]}
                    />
                </section>
            </div>
        </AccessControlUiProvider>
    );
}