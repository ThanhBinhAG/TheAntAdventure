/**
 * Module server-only tạo Supabase Auth user cho Access Control.
 *
 * Chức năng:
 * - Dùng SUPABASE_SERVICE_ROLE_KEY để tạo Auth user.
 * - Không bao giờ trả service-role key ra trình duyệt.
 * - Có hàm rollback xóa Auth user mới tạo nếu bước gán profile/role thất bại.
 *
 * Lưu ý:
 * - Chỉ API Access Control phía server được import file này.
 * - Việc kiểm tra users.manage vẫn làm tại API và RPC database.
 */

import 'server-only';

import {
    createClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import {
    BREAK_GLASS_SHADOW_EMAIL,
} from '@/lib/auth/break-glass-supabase';
import {
    getSupabaseServiceRoleKey,
    getSupabaseUrl,
} from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';

/** Lỗi riêng để API trả HTTP status phù hợp. */
export class AccessControlAuthAdminError extends Error {
    constructor(
        message: string,
        public readonly status: 400 | 403 | 503,
    ) {
        super(message);
        this.name = 'AccessControlAuthAdminError';
    }
}

/** Tạo Supabase Admin client chỉ ở server. */
function getAccessControlAdminClient(): SupabaseClient | null {
    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    if (!url || !serviceRoleKey) {
        return null;
    }

    return createClient(url, serviceRoleKey, {
        ...getSupabaseGlobalFetchOptions(),
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/** Tạo Auth user bằng email/password do Super Admin nhập. */
export async function createAccessControlAuthUser(input: {
    email: string;
    password: string;
}): Promise<string> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Không được tạo hoặc ghi đè user shadow dành cho break-glass.
    if (normalizedEmail === BREAK_GLASS_SHADOW_EMAIL) {
        throw new AccessControlAuthAdminError(
            'Email này không được sử dụng.',
            403,
        );
    }

    const admin = getAccessControlAdminClient();

    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { data, error } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: input.password,
        email_confirm: true,
    });

    if (error || !data.user) {
        // Không trả lỗi Supabase chi tiết để tránh lộ thông tin email.
        throw new AccessControlAuthAdminError(
            'Không thể tạo tài khoản. Email có thể đã tồn tại.',
            400,
        );
    }

  return data.user.id;
}

/** Ban/unban the Auth account so refresh/login are revoked with CRM account status. */
export async function setAccessControlAuthUserActive(
    userId: string,
    isActive: boolean,
): Promise<void> {
    const admin = getAccessControlAdminClient();
    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h',
    });
    if (error) {
        throw new AccessControlAuthAdminError(
            isActive
                ? 'Không thể kích hoạt tài khoản Supabase Auth.'
                : 'Không thể khóa tài khoản Supabase Auth.',
            503,
        );
    }

    if (!isActive) {
        try {
            await getCrmSessionRepository().revokeAllForUser(userId);
        } catch {
            throw new AccessControlAuthAdminError(
                'Không thể thu hồi CRM session đang hoạt động.',
                503,
            );
        }
    }
}

/** Cập nhật mật khẩu mới cho Auth user bằng Supabase Admin SDK. */
export async function updateAccessControlUserPassword(
    userId: string,
    newPassword: string,
): Promise<void> {
    const admin = getAccessControlAdminClient();
    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) {
        throw new AccessControlAuthAdminError(
            'Không thể đổi mật khẩu người dùng.',
            503,
        );
    }
}

/**
 * Xóa Auth user mới tạo khi gán profile/role thất bại.
 *
 * Chỉ dùng rollback ngay sau createUser thất bại một phần.
 * Không dùng hàm này cho thao tác “xóa user” thông thường.
 */
export async function rollbackNewAccessControlAuthUser(
    userId: string,
): Promise<void> {
    const admin = getAccessControlAdminClient();

    if (!admin) return;

    await admin.auth.admin.deleteUser(userId);
}
