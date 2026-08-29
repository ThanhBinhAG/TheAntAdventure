/**
 * Ghi lịch sử đăng nhập bằng service role ở server.
 *
 * Browser không có quyền tự ghi event để tránh người dùng giả mạo lịch sử.
 */
import 'server-only';

import {
    createClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import {
    getSupabaseServiceRoleKey,
    getSupabaseUrl,
} from '@/lib/server/env/supabase';
import type {
    LoginClientMetadata,
} from '@/lib/auth/login-history';

type LoginMethod = 'password' | 'break_glass';

function getLoginHistoryAdminClient(): SupabaseClient | null {
    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    if (!url || !serviceRoleKey) return null;

    return createClient(url, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/**
 * Ghi một lần đăng nhập đã thành công.
 *
 * Hàm ném lỗi để Route Handler quyết định ghi lỗi kỹ thuật, nhưng Route
 * Handler tuyệt đối không được chặn login chỉ vì audit log bị lỗi.
 */
export async function recordSuccessfulLogin(input: {
    userId: string | null;
    authMethod: LoginMethod;
    metadata: LoginClientMetadata;
}): Promise<void> {
    const supabase = getLoginHistoryAdminClient();

    if (!supabase) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình cho login history.',
        );
    }

    const { error } = await supabase
        .from('auth_login_events')
        .insert({
            user_id: input.userId,
            event_type: 'login_succeeded',
            auth_method: input.authMethod,
            ip_address: input.metadata.ipAddress,
            browser_name: input.metadata.browserName,
            operating_system: input.metadata.operatingSystem,
            device_type: input.metadata.deviceType,
            user_agent: input.metadata.userAgent,
        });

    if (error) {
        throw new Error('Không thể ghi lịch sử đăng nhập.');
    }
}
