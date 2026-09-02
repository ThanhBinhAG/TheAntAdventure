import React from 'react';
import { Card, Radio, Button, Tooltip } from 'antd';
import {
    CalendarOutlined,
    CheckSquareOutlined,
    FilterOutlined,
    GlobalOutlined,
    MessageOutlined,
    SaveOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import type { AccessControlResourceScope } from '../access-control-api';
import { tac } from '@/lib/i18n/pages/access-control';
import styles from '../AccessControlPage.module.css';

export type ResourceScopeChoice = AccessControlResourceScope['scope'] | 'none';

const RESOURCE_SCOPE_RESOURCES: Array<{
    code: AccessControlResourceScope['resource_code'];
    vi: string;
    en: string;
}> = [
        { code: 'customers', vi: 'Khách hàng', en: 'Customers' },
        { code: 'leads', vi: 'Lead', en: 'Leads' },
        { code: 'tour_drafts', vi: 'Bản nháp tour', en: 'Tour drafts' },
        { code: 'bookings', vi: 'Booking', en: 'Bookings' },
        { code: 'tasks', vi: 'Công việc', en: 'Tasks' },
        { code: 'comms', vi: 'Trao đổi khách hàng', en: 'Customer communications' },
    ];

const RESOURCE_SCOPE_ACTIONS: AccessControlResourceScope['action'][] = [
    'read',
    'write',
    'delete',
];

function resourceScopeIcon(
    resourceCode: AccessControlResourceScope['resource_code'],
) {
    switch (resourceCode) {
        case 'customers':
            return <TeamOutlined />;
        case 'leads':
            return <FilterOutlined />;
        case 'tour_drafts':
            return <GlobalOutlined />;
        case 'bookings':
            return <CalendarOutlined />;
        case 'tasks':
            return <CheckSquareOutlined />;
        case 'comms':
            return <MessageOutlined />;
    }
}

export interface ResourceScopesTabContentProps {
    saving: boolean;
    hasScopeChanges: boolean;
    scopeFor: (resourceCode: AccessControlResourceScope['resource_code'], action: AccessControlResourceScope['action']) => ResourceScopeChoice;
    updateScope: (resourceCode: AccessControlResourceScope['resource_code'], action: AccessControlResourceScope['action'], scope: ResourceScopeChoice) => void;
    discardScopeChanges: () => void;
    handleSaveResourceScopes: () => void;
    selectedPermissionCodes: string[];
    language: 'vi' | 'en';
}

function getRequiredPermission(
    resource: AccessControlResourceScope['resource_code'],
    action: AccessControlResourceScope['action'],
): string {
    if (resource === 'customers' && action === 'read') return 'customers.read';
    if (resource === 'customers') return 'customers.write';
    if (resource === 'leads' && action === 'read') return 'sales.read';
    if (resource === 'leads') return 'sales.write';
    if (resource === 'tour_drafts' && action === 'read') return 'tour_design.read';
    if (resource === 'tour_drafts') return 'tour_design.write';
    if (resource === 'bookings' && action === 'read') return 'bookings.read';
    if (resource === 'bookings') return 'bookings.write';
    if (resource === 'tasks' && action === 'read') return 'planner.read';
    if (resource === 'tasks') return 'planner.write';
    if (resource === 'comms' && action === 'read') return 'customers.read';
    if (resource === 'comms') return 'customers.write';
    return '';
}

export const ResourceScopesTabContent = React.memo(function ResourceScopesTabContent({
    saving,
    hasScopeChanges,
    scopeFor,
    updateScope,
    discardScopeChanges,
    handleSaveResourceScopes,
    selectedPermissionCodes,
    language,
}: ResourceScopesTabContentProps) {
    return (
        <section className={styles.resourceScopesSection}>
            <div className={styles.resourceScopesHeader}>
                <div>
                    <h3 className={styles.resourceScopesTitle}>
                        {tac('rlsDataScopes', language)}
                    </h3>
                    <p className={styles.sectionDescription}>
                        {tac('rlsDataScopesDescription', language)}
                    </p>
                </div>
            </div>
            <div className={styles.resourceScopesGrid}>
                {RESOURCE_SCOPE_RESOURCES.map((resource) => (
                    <Card key={resource.code} size="small" className={styles.resourceScopeCard}>
                        <div className={styles.resourceScopeCardTitle}>
                            <span className={styles.resourceScopeIcon} aria-hidden="true">
                                {resourceScopeIcon(resource.code)}
                            </span>
                            <strong>{language === 'vi' ? resource.vi : resource.en}</strong>
                        </div>
                        <div className={styles.resourceScopeActions}>
                            {RESOURCE_SCOPE_ACTIONS.map((action) => {
                                const allowedScopes: ResourceScopeChoice[] = [
                                    'none',
                                    'own',
                                    'all',
                                ];
                                const actionLabel = tac(action, language);
                                const requiredPermission = getRequiredPermission(resource.code, action);
                                const hasPermission = !requiredPermission || selectedPermissionCodes.includes(requiredPermission);
                                const isRowDisabled = !hasPermission;
                                const tooltipTitle = language === 'vi'
                                    ? `Yêu cầu quyền chức năng: ${requiredPermission}`
                                    : `Requires functional permission: ${requiredPermission}`;

                                return (
                                    <div
                                        key={action}
                                        className={`${styles.resourceScopeActionRow} ${isRowDisabled ? styles.resourceScopeActionRowDisabled : ''
                                            }`}
                                    >
                                        <span className={styles.resourceScopeActionLabel}>{actionLabel}</span>
                                        <Tooltip
                                            title={isRowDisabled ? tooltipTitle : undefined}
                                            placement="topLeft"
                                        >
                                            <div style={{ width: '100%' }}>
                                                <Radio.Group
                                                    aria-label={`${language === 'vi' ? resource.vi : resource.en}: ${actionLabel}`}
                                                    buttonStyle="solid"
                                                    className={styles.resourceScopeControl}
                                                    disabled={saving || isRowDisabled}
                                                    optionType="button"
                                                    size="small"
                                                    value={isRowDisabled ? 'none' : scopeFor(resource.code, action)}
                                                    onChange={(event) => updateScope(
                                                        resource.code,
                                                        action,
                                                        event.target.value as ResourceScopeChoice,
                                                    )}
                                                >
                                                    {allowedScopes.map((scope) => (
                                                        <Radio.Button key={scope} value={scope}>
                                                            {scope === 'none'
                                                                ? tac('scopeNone', language)
                                                                : scope === 'own'
                                                                    ? tac('scopeOwn', language)
                                                                    : tac('scopeAll', language)}
                                                        </Radio.Button>
                                                    ))}
                                                </Radio.Group>
                                            </div>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>
            <div className={styles.permissionSaveBar}>
                <span aria-live="polite">
                    {hasScopeChanges
                        ? tac('unsavedScopeChanges', language)
                        : tac('noUnsavedScopeChanges', language)}
                </span>
                <div className={styles.permissionSaveActions}>
                    <Button
                        disabled={!hasScopeChanges || saving}
                        onClick={discardScopeChanges}
                    >
                        {tac('discardChanges', language)}
                    </Button>
                    <Button
                        icon={<SaveOutlined />}
                        type="primary"
                        loading={saving}
                        disabled={!hasScopeChanges}
                        onClick={handleSaveResourceScopes}
                    >
                        {tac('saveScopes', language)}
                    </Button>
                </div>
            </div>
        </section>
    );
});
