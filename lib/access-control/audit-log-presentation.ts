/**
 * Quy đổi action kỹ thuật trong audit log thành nội dung hiển thị.
 *
 * Chức năng:
 * - Giữ tên action của database ở một nơi duy nhất.
 * - Trả về nhãn tiếng Việt và màu Tag tương ứng cho giao diện.
 * - Giữ action lạ hiển thị nguyên văn để dễ chẩn đoán khi mở rộng sau này.
 *
 * Lưu ý:
 * - File này chỉ chứa dữ liệu thuần, không phụ thuộc React hay Supabase.
 */

export type AccessControlAuditActionPresentation = {
    label: string;
    color: string;
};

/** Bảng quy đổi action database sang cách hiển thị trên UI. */
const AUDIT_ACTION_PRESENTATIONS: Record<
    string,
    AccessControlAuditActionPresentation
> = {
    user_role_changed: {
        label: 'Đổi role người dùng',
        color: 'blue',
    },
    role_permissions_replaced: {
        label: 'Cập nhật quyền role',
        color: 'green',
    },
    user_profile_updated: {
        label: 'Cập nhật thông tin người dùng',
        color: 'cyan',
    },
    user_activated: {
        label: 'Kích hoạt tài khoản',
        color: 'green',
    },
    user_deactivated: {
        label: 'Vô hiệu hóa tài khoản',
        color: 'orange',
    },
    user_soft_deleted: {
        label: 'Xóa mềm tài khoản',
        color: 'red',
    },
    user_restored: {
        label: 'Khôi phục tài khoản',
        color: 'cyan',
    },
};

/** Lấy nhãn và màu hiển thị cho một action audit. */
export function getAccessControlAuditActionPresentation(
    action: string,
): AccessControlAuditActionPresentation {
    return AUDIT_ACTION_PRESENTATIONS[action] ?? {
        label: action,
        color: 'default',
    };
}
