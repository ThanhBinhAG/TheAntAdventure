/**
 * Quy đổi action kỹ thuật trong audit log thành nội dung hiển thị.
 *
 * Chức năng:
 * - Giữ tên action của database ở một nơi duy nhất.
 * - Trả về nhãn theo ngôn ngữ hiện tại và màu Tag tương ứng cho giao diện.
 * - Giữ action lạ hiển thị nguyên văn để dễ chẩn đoán khi mở rộng sau này.
 *
 * Lưu ý:
 * - File này chỉ chứa dữ liệu thuần, không phụ thuộc React hay Supabase.
 */

import type { AppLanguage } from '@/lib/i18n/stages';
import {
    tac,
    type AccessControlKey,
} from '@/lib/i18n/pages/access-control';

export type AccessControlAuditActionPresentation = {
    label: string;
    color: string;
};

/** Bảng quy đổi action database sang cách hiển thị trên UI. */
const AUDIT_ACTION_PRESENTATIONS: Record<
    string,
    Omit<AccessControlAuditActionPresentation, 'label'> & {
        labelKey: AccessControlKey;
    }
> = {
    permission_created: {
        labelKey: 'auditPermissionCreated',
        color: 'green',
    },
    user_role_changed: {
        labelKey: 'auditUserRoleChanged',
        color: 'blue',
    },
    role_permissions_replaced: {
        labelKey: 'auditRolePermissionsReplaced',
        color: 'green',
    },
    staff_role_created: {
        labelKey: 'auditStaffRoleCreated',
        color: 'green',
    },
    staff_role_updated: {
        labelKey: 'auditStaffRoleUpdated',
        color: 'blue',
    },
    staff_role_deleted: {
        labelKey: 'auditStaffRoleDeleted',
        color: 'red',
    },
    staff_role_permissions_replaced: {
        labelKey: 'auditStaffRolePermissionsReplaced',
        color: 'green',
    },
    staff_role_resource_scopes_replaced: {
        labelKey: 'auditStaffRoleResourceScopesReplaced',
        color: 'green',
    },
    core_record_owner_reassigned: {
        labelKey: 'auditCoreRecordOwnerReassigned',
        color: 'blue',
    },
    core_record_assignee_changed: {
        labelKey: 'auditCoreRecordAssigneeChanged',
        color: 'cyan',
    },
    user_profile_updated: {
        labelKey: 'auditUserProfileUpdated',
        color: 'cyan',
    },
    user_activated: {
        labelKey: 'auditUserActivated',
        color: 'green',
    },
    user_deactivated: {
        labelKey: 'auditUserDeactivated',
        color: 'orange',
    },
    user_soft_deleted: {
        labelKey: 'auditUserSoftDeleted',
        color: 'red',
    },
    user_restored: {
        labelKey: 'auditUserRestored',
        color: 'cyan',
    },
};

/** Lấy nhãn và màu hiển thị cho một action audit. */
export function getAccessControlAuditActionPresentation(
    action: string,
    language: AppLanguage = 'vi',
): AccessControlAuditActionPresentation {
    const presentation = AUDIT_ACTION_PRESENTATIONS[action];

    if (!presentation) {
        return {
            label: action,
            color: 'default',
        };
    }

    return {
        label: tac(presentation.labelKey, language),
        color: presentation.color,
    };
}
