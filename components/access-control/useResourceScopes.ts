import { useState, useMemo, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import {
    updateAccessControlStaffRoleResourceScopes,
    getAccessControlErrorMessage,
    type AccessControlResourceScope,
    type AccessControlStaffRole,
} from './access-control-api';
import { tac, tacTemplate } from '@/lib/i18n/pages/access-control';

export type ResourceScopeChoice = AccessControlResourceScope['scope'] | 'none';

export interface UseResourceScopesProps {
    activeRole: AccessControlStaffRole | undefined;
    language: 'vi' | 'en';
    reloadRoles: () => Promise<void>;
    refreshAuditLogs: () => void;
}

function hasSameResourceScopes(
    first: AccessControlResourceScope[],
    second: AccessControlResourceScope[],
) {
    const toComparable = (scopes: AccessControlResourceScope[]) => scopes
        .map((scope) => `${scope.resource_code}:${scope.action}:${scope.scope}`)
        .sort();

    const firstComparable = toComparable(first);
    const secondComparable = toComparable(second);

    return firstComparable.length === secondComparable.length &&
        firstComparable.every((scope, index) => scope === secondComparable[index]);
}

const EMPTY_RESOURCE_SCOPES: AccessControlResourceScope[] = [];

export function useResourceScopes({
    activeRole,
    language,
    reloadRoles,
    refreshAuditLogs,
}: UseResourceScopesProps) {
    const [scopeDrafts, setScopeDrafts] = useState<
        Record<string, AccessControlResourceScope[]>
    >({});
    const [saving, setSaving] = useState(false);

    const selectedResourceScopes = useMemo(() => {
        if (!activeRole) return EMPTY_RESOURCE_SCOPES;
        return scopeDrafts[activeRole.role_code] ?? activeRole.resource_scopes;
    }, [activeRole, scopeDrafts]);

    const hasScopeChanges = useMemo(() => {
        if (!activeRole) return false;
        return !hasSameResourceScopes(
            selectedResourceScopes,
            activeRole.resource_scopes,
        );
    }, [activeRole, selectedResourceScopes]);

    const scopeFor = useCallback((
        resourceCode: AccessControlResourceScope['resource_code'],
        action: AccessControlResourceScope['action'],
    ): ResourceScopeChoice => {
        return selectedResourceScopes.find(
            (scope) =>
                scope.resource_code === resourceCode &&
                scope.action === action,
        )?.scope ?? 'none';
    }, [selectedResourceScopes]);

    const updateScope = useCallback((
        resourceCode: AccessControlResourceScope['resource_code'],
        action: AccessControlResourceScope['action'],
        scope: ResourceScopeChoice,
    ) => {
        if (!activeRole) return;

        setScopeDrafts((current) => {
            const currentScopes = current[activeRole.role_code] ??
                activeRole.resource_scopes;
            const withoutCurrent = currentScopes.filter(
                (item) =>
                    item.resource_code !== resourceCode ||
                    item.action !== action,
            );
            const nextScopes = scope === 'none'
                ? withoutCurrent
                : [
                    ...withoutCurrent,
                    { resource_code: resourceCode, action, scope },
                ];

            return {
                ...current,
                [activeRole.role_code]: nextScopes,
            };
        });
    }, [activeRole]);

    const discardScopeChanges = useCallback(() => {
        if (!activeRole) return;

        setScopeDrafts((current) => {
            const next = { ...current };
            delete next[activeRole.role_code];
            return next;
        });
    }, [activeRole]);

    const handleSaveResourceScopes = useCallback(async () => {
        if (!activeRole) return;
        const confirmed = await confirmDialog(
            tacTemplate('confirmSaveScopes', language, {
                role: activeRole.role_label,
            }),
            {
                title: tac('confirmSaveScopesTitle', language),
                confirmLabel: tac('saveScopes', language),
                cancelLabel: tac('cancel', language),
            },
        );
        if (!confirmed) return;

        setSaving(true);
        try {
            await updateAccessControlStaffRoleResourceScopes(
                activeRole.role_code,
                selectedResourceScopes,
            );
            await reloadRoles();
            refreshAuditLogs();
            discardScopeChanges();
            toast.success(
                tac('auditStaffRoleResourceScopesReplaced', language),
            );
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateRoleFailed',
            ));
        } finally {
            setSaving(false);
        }
    }, [activeRole, selectedResourceScopes, language, reloadRoles, refreshAuditLogs, discardScopeChanges]);

    const clearDraft = useCallback((roleCode: string) => {
        setScopeDrafts((current) => {
            const next = { ...current };
            delete next[roleCode];
            return next;
        });
    }, []);

    return {
        selectedResourceScopes,
        hasScopeChanges,
        saving,
        scopeFor,
        updateScope,
        discardScopeChanges,
        handleSaveResourceScopes,
        clearDraft,
    };
}
