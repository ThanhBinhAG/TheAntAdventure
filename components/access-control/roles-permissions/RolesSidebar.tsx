import React from 'react';
import { Button, Empty, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { AccessControlStaffRole } from '../access-control-api';
import { tac } from '@/lib/i18n/pages/access-control';
import styles from '../AccessControlPage.module.css';

export interface RolesSidebarProps {
    roles: AccessControlStaffRole[];
    activeRole: AccessControlStaffRole | undefined;
    selectedRoleCode: string | null;
    onSelectRole: (code: string) => void;
    onCreateOpen: () => void;
    language: 'vi' | 'en';
}

export const RolesSidebar = React.memo(function RolesSidebar({
    roles,
    activeRole,
    selectedRoleCode,
    onSelectRole,
    onCreateOpen,
    language,
}: RolesSidebarProps) {
    return (
        <aside className={styles.roleList}>
            <div className={styles.roleListHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>{tac('roleList', language)}</h2>
                    <p className={styles.sectionDescription}>{tac('roleListDescription', language)}</p>
                </div>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onCreateOpen}>{tac('addRole', language)}</Button>
            </div>

            {roles.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={tac('noStaffRoles', language)} />
            ) : roles.map((role) => (
                <button
                    key={role.role_code}
                    type="button"
                    className={`${styles.roleChoice} ${
                        (selectedRoleCode ?? activeRole?.role_code) === role.role_code
                            ? styles.roleChoiceActive
                            : ''
                    }`}
                    onClick={() => onSelectRole(role.role_code)}
                >
                    <span className={styles.roleChoiceContent}>
                        <span className={styles.roleChoiceText}>
                            <strong>{role.role_label}</strong>
                            <small>{role.role_description || tac('noRoleDescription', language)}</small>
                        </span>
                        <span className={styles.roleChoiceCount}>
                            {role.permission_codes.length} {tac('permissionCount', language)}
                        </span>
                    </span>
                    <span className={styles.roleChoiceFooter}>
                        <span>{role.assigned_user_count} {tac('employeeCount', language)}</span>
                        {!role.is_active && <Tag color="default">{tac('inactiveRoleBadge', language)}</Tag>}
                    </span>
                </button>
            ))}
        </aside>
    );
});
