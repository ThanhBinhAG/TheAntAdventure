import React, { useMemo } from 'react';
import { Card, Checkbox, Input, Empty, Alert, Button } from 'antd';
import { SearchOutlined, SaveOutlined } from '@ant-design/icons';
import type { AccessControlPermission, AccessControlStaffRole } from '../access-control-api';
import { tac, tacTemplate } from '@/lib/i18n/pages/access-control';
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

        return (
            <Card size="small" className={styles.permissionGroup}>
                <div className={styles.permissionGroupHeader}>
                    <div className={styles.permissionGroupTitle}>
                        <strong>{group.label}</strong>
                        <span>{selectedCount}/{codes.length} {tac('permissionCount', language)}</span>
                    </div>
                    {codes.length > 1 && !permissionSearch.trim() && (
                        <Checkbox
                            aria-label={tacTemplate('selectAllGroupPermissions', language, { group: group.label })}
                            checked={selectedCount === codes.length}
                            indeterminate={selectedCount > 0 && selectedCount < codes.length}
                            disabled={saving}
                            onChange={(event) =>
                                updateDraft((current) =>
                                    event.target.checked
                                        ? [...new Set([...current, ...codes])]
                                        : current.filter((code) => !codes.includes(code))
                                )
                            }
                        />
                    )}
                </div>
                <div className={styles.permissionRows}>
                    {group.items.map((permission) => (
                        <Checkbox
                            key={permission.permission_code}
                            checked={selectedSet.has(permission.permission_code)}
                            disabled={saving}
                            className={styles.permissionRow}
                            onChange={(event) =>
                                updateDraft((current) =>
                                    event.target.checked
                                        ? [...new Set([...current, permission.permission_code])]
                                        : current.filter((code) => code !== permission.permission_code)
                                )
                            }
                        >
                            <span className={styles.permissionText}>{permission.permission_description}</span>
                        </Checkbox>
                    ))}
                </div>
            </Card>
        );
    },
    (prevProps, nextProps) => {
        if (
            prevProps.group !== nextProps.group ||
            prevProps.saving !== nextProps.saving ||
            prevProps.language !== nextProps.language ||
            prevProps.permissionSearch !== nextProps.permissionSearch
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
