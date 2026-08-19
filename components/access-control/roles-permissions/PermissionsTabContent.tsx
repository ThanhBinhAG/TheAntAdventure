import React, { useMemo } from 'react';
import { Checkbox, Input, Empty, Alert, Button } from 'antd';
import {
    SearchOutlined,
    SaveOutlined,
    DownOutlined,
    DashboardOutlined,
    CalendarOutlined,
    TeamOutlined,
    AppstoreOutlined,
    PictureOutlined,
    CompassOutlined,
    HomeOutlined,
    CloudOutlined,
    FileTextOutlined,
    ShopOutlined,
    SafetyCertificateOutlined,
    RobotOutlined,
    PercentageOutlined,
    HeartOutlined,
    ContactsOutlined,
    LineChartOutlined,
    PushpinOutlined,
    CreditCardOutlined,
    TagsOutlined,
    BookOutlined,
    FileProtectOutlined,
    FlagOutlined,
    CommentOutlined,
    BankOutlined,
    PayCircleOutlined,
    InfoCircleOutlined,
    UsergroupAddOutlined,
    CodeOutlined,
    MessageOutlined,
    KeyOutlined
} from '@ant-design/icons';
import type { AccessControlPermission, AccessControlStaffRole } from '../access-control-api';
import { tac } from '@/lib/i18n/pages/access-control';
import { formatPermissionAssignmentSummary } from '../role-permission-ui';
import styles from '../AccessControlPage.module.css';

interface PermissionGroup {
    code: string;
    label: string;
    items: AccessControlPermission[];
}

interface PermissionGroupCardProps {
    group: PermissionGroup;
    selectedSet: Set<string>;
    saving: boolean;
    permissionSearch: string;
    language: 'vi' | 'en';
    updateDraft: (update: (current: string[]) => string[]) => void;
}

function getGroupIcon(groupCode: string) {
    switch (groupCode) {
        case 'dashboard':
            return <DashboardOutlined />;
        case 'planner':
            return <CalendarOutlined />;
        case 'customers':
            return <TeamOutlined />;
        case 'agents':
            return <ContactsOutlined />;
        case 'sales':
            return <LineChartOutlined />;
        case 'tour_design':
            return <CompassOutlined />;
        case 'products':
            return <AppstoreOutlined />;
        case 'gallery':
            return <PictureOutlined />;
        case 'attractions':
            return <PushpinOutlined />;
        case 'pricing':
            return <CreditCardOutlined />;
        case 'pricing_essentials':
            return <TagsOutlined />;
        case 'pricing_accommodation':
            return <HomeOutlined />;
        case 'weather':
            return <CloudOutlined />;
        case 'bookings':
            return <BookOutlined />;
        case 'contracts':
            return <FileProtectOutlined />;
        case 'suppliers':
            return <ShopOutlined />;
        case 'guides':
            return <FlagOutlined />;
        case 'posttour':
            return <CommentOutlined />;
        case 'finance':
            return <BankOutlined />;
        case 'tax':
            return <PercentageOutlined />;
        case 'salary':
            return <PayCircleOutlined />;
        case 'about':
            return <InfoCircleOutlined />;
        case 'culture':
            return <HeartOutlined />;
        case 'regulations':
            return <FileTextOutlined />;
        case 'hr':
            return <UsergroupAddOutlined />;
        case 'ai':
            return <RobotOutlined />;
        case 'devnotes':
            return <CodeOutlined />;
        case 'teamchat':
            return <MessageOutlined />;
        case 'access_control':
            return <KeyOutlined />;
        default:
            return <SafetyCertificateOutlined />;
    }
}

function getPermissionBadge(code: string, language: 'vi' | 'en') {
    if (code.endsWith('.read')) {
        return language === 'vi' ? 'Xem' : 'View';
    }
    if (code.endsWith('.write')) {
        return language === 'vi' ? 'Sửa' : 'Edit';
    }
    return '';
}

const PermissionGroupCard = React.memo(
    function PermissionGroupCard({
        group,
        selectedSet,
        saving,
        permissionSearch,
        language,
        updateDraft,
    }: PermissionGroupCardProps) {
        const codes = group.items.map((item) => item.permission_code);
        const selectedCount = codes.filter((code) => selectedSet.has(code)).length;

        // Trạng thái sập/mở mặc định là đóng (true)
        const [isCollapsed, setIsCollapsed] = React.useState(true);

        // Tự động mở nếu có tìm kiếm
        const isExpanded = !isCollapsed || permissionSearch.trim().length > 0;

        return (
            <div
                className={`${styles.permissionGroup} ${
                    isExpanded ? styles.permissionGroupExpanded : ''
                }`}
            >
                <div
                    className={`${styles.permissionGroupHeader} ${
                        isExpanded ? styles.permissionGroupHeaderExpanded : ''
                    }`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <div className={styles.permissionGroupTitle}>
                        <span className={styles.resourceScopeIcon} aria-hidden="true">
                            {getGroupIcon(group.code)}
                        </span>
                        <div className={styles.permissionGroupTitleText}>
                            <strong>{group.label}</strong>
                            <span>
                                ({selectedCount}/{codes.length})
                            </span>
                        </div>
                    </div>

                    <span
                        className={`${styles.permissionGroupChevron} ${
                            isExpanded ? styles.permissionGroupChevronExpanded : ''
                        }`}
                    >
                        <DownOutlined />
                    </span>
                </div>

                {isExpanded && (
                    <div className={styles.permissionRows}>
                        {group.items.map((permission) => {
                            const badgeText = getPermissionBadge(permission.permission_code, language);
                            return (
                                <div key={permission.permission_code} className={styles.permissionRow}>
                                    <Checkbox
                                        checked={selectedSet.has(permission.permission_code)}
                                        disabled={saving}
                                        onChange={(event) =>
                                            updateDraft((current) =>
                                                event.target.checked
                                                    ? [...new Set([...current, permission.permission_code])]
                                                    : current.filter((code) => code !== permission.permission_code)
                                            )
                                        }
                                    >
                                        <span className={styles.permissionText}>
                                            {permission.permission_description}
                                        </span>
                                    </Checkbox>

                                    {badgeText && (
                                        <span className={styles.permissionBadge}>
                                            {badgeText}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    },
    (prevProps, nextProps) => {
        if (
            prevProps.group !== nextProps.group ||
            prevProps.saving !== nextProps.saving ||
            prevProps.language !== nextProps.language ||
            prevProps.permissionSearch !== nextProps.permissionSearch ||
            prevProps.updateDraft !== nextProps.updateDraft
        ) {
            return false;
        }

        const prevCodes = prevProps.group.items.map(i => i.permission_code);
        const nextCodes = nextProps.group.items.map(i => i.permission_code);
        
        const prevSelected = prevCodes.filter(code => prevProps.selectedSet.has(code));
        const nextSelected = nextCodes.filter(code => nextProps.selectedSet.has(code));

        if (prevSelected.length !== nextSelected.length) return false;
        return prevSelected.every((code, i) => code === nextSelected[i]);
    }
);

export interface PermissionsTabContentProps {
    activeRole: AccessControlStaffRole;
    permissions: AccessControlPermission[];
    visiblePermissionGroups: PermissionGroup[];
    permissionSearch: string;
    setPermissionSearch: (value: string) => void;
    selectedPermissionCodes: string[];
    hasChanges: boolean;
    saving: boolean;
    updateDraft: (update: (current: string[]) => string[]) => void;
    handleDiscardPermissionChanges: () => void;
    handleSavePermissions: () => void;
    language: 'vi' | 'en';
}

export const PermissionsTabContent = React.memo(function PermissionsTabContent({
    activeRole,
    permissions,
    visiblePermissionGroups,
    permissionSearch,
    setPermissionSearch,
    selectedPermissionCodes,
    hasChanges,
    saving,
    updateDraft,
    handleDiscardPermissionChanges,
    handleSavePermissions,
    language,
}: PermissionsTabContentProps) {
    const selectedSet = useMemo(() => new Set(selectedPermissionCodes), [selectedPermissionCodes]);

    return (
        <div className={styles.permissionsSection}>
            <div className={styles.permissionWorkspaceMeta}>
                <span>
                    {formatPermissionAssignmentSummary(
                        selectedPermissionCodes.length,
                        permissions.length,
                        tac('permissionSummary', language),
                    )}
                </span>
            </div>

            <Input
                aria-label={tac('searchPermissions', language)}
                allowClear
                className={styles.permissionSearch}
                placeholder={tac('searchPermissions', language)}
                prefix={<SearchOutlined />}
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
            />

            {!activeRole.is_active ? (
                <Alert
                    type="warning"
                    showIcon
                    message={tac('roleDisabled', language)}
                    description={tac('roleInactiveDescription', language)}
                />
            ) : (
                <>
                    <div className={styles.permissionGroups}>
                        {visiblePermissionGroups.length === 0 ? (
                            <Empty
                                className={styles.permissionSearchEmpty}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={tac('noMatchingPermissions', language)}
                            />
                        ) : (
                            visiblePermissionGroups.map((group) => (
                                <PermissionGroupCard
                                    key={group.code}
                                    group={group}
                                    selectedSet={selectedSet}
                                    saving={saving}
                                    permissionSearch={permissionSearch}
                                    language={language}
                                    updateDraft={updateDraft}
                                />
                            ))
                        )}
                    </div>
                    <div className={styles.permissionSaveBar}>
                        <span aria-live="polite">
                            {hasChanges
                                ? tac('unsavedChanges', language)
                                : tac('noUnsavedChanges', language)}
                        </span>
                        <div className={styles.permissionSaveActions}>
                            <Button
                                disabled={!hasChanges || saving}
                                onClick={handleDiscardPermissionChanges}
                            >
                                {tac('discardChanges', language)}
                            </Button>
                            <Button
                                icon={<SaveOutlined />}
                                type="primary"
                                loading={saving}
                                disabled={!hasChanges}
                                onClick={handleSavePermissions}
                            >
                                {tac('savePermissions', language)}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});
