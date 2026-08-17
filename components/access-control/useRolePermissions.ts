import { useState, useMemo, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import {
    updateAccessControlStaffRolePermissions,
    getAccessControlErrorMessage,
    type AccessControlStaffRole,
} from './access-control-api';
import {
    discardRolePermissionDraft,
} from './role-permission-ui';
import { tac, tacTemplate } from '@/lib/i18n/pages/access-control';

export interface UseRolePermissionsProps {
    activeRole: AccessControlStaffRole | undefined;
    language: 'vi' | 'en';
    reloadRoles: () => Promise<void>;
    refreshAuditLogs: () => void;
}

export function useRolePermissions({
    activeRole,
    language,
    reloadRoles,
    refreshAuditLogs,
}: UseRolePermissionsProps) {
    const [drafts, setDrafts] = useState<Record<string, string[]>>({});
    const [permissionSearch, setPermissionSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const selectedPermissionCodes = useMemo(() => {
        if (!activeRole) return [];
        return drafts[activeRole.role_code] ?? activeRole.permission_codes;
    }, [activeRole, drafts]);

    const hasChanges = useMemo(() => {
        if (!activeRole) return false;
        const current = activeRole.permission_codes;
        return (
            selectedPermissionCodes.length !== current.length ||
            !selectedPermissionCodes.every((code) => current.includes(code))
        );
    }, [activeRole, selectedPermissionCodes]);

    const updateDraft = useCallback((update: (current: string[]) => string[]) => {
        if (!activeRole) return;
        setDrafts((current) => ({
            ...current,
            [activeRole.role_code]: update(current[activeRole.role_code] ?? activeRole.permission_codes),
        }));
    }, [activeRole]);

    const handleDiscardPermissionChanges = useCallback(() => {
        if (!activeRole) return;
        setDrafts((current) => discardRolePermissionDraft(current, activeRole.role_code));
    }, [activeRole]);

    const handleSavePermissions = useCallback(async () => {
        if (!activeRole) return;
        const confirmed = await confirmDialog(
            tacTemplate('updatePermissionsConfirmation', language, {
                count: selectedPermissionCodes.length,
                role: activeRole.role_label,
            }),
            {
                title: tac('confirmUpdatePermissions', language),
                confirmLabel: tac('savePermissions', language),
                cancelLabel: tac('cancel', language),
                danger: false,
            },
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            await updateAccessControlStaffRolePermissions(activeRole.role_code, selectedPermissionCodes);
            await reloadRoles();
            refreshAuditLogs();
            setDrafts((current) => {
                const next = { ...current };
                delete next[activeRole.role_code];
                return next;
            });
            toast.success(tac('permissionsUpdated', language));
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updatePermissionsFailed',
            ));
        } finally {
            setSaving(false);
        }
    }, [activeRole, selectedPermissionCodes, language, reloadRoles, refreshAuditLogs]);

    const clearDraft = useCallback((roleCode: string) => {
        setDrafts((current) => {
            const next = { ...current };
            delete next[roleCode];
            return next;
        });
    }, []);

    return {
        permissionSearch,
        setPermissionSearch,
        selectedPermissionCodes,
        hasChanges,
        saving,
        updateDraft,
        handleDiscardPermissionChanges,
        handleSavePermissions,
        clearDraft,
    };
}
