/**
 * File này là lớp giao tiếp giữa API Next.js và các RPC phân quyền trong Supabase.
 *
 * Chức năng:
 * - Dùng cookie session hiện tại để Supabase nhận đúng auth.uid().
 * - Lấy danh sách user, role và permission cho màn hình Access Control.
 * - Gọi RPC đổi role user hoặc thay permission của role.
 *
 * Lưu ý:
 * - Không dùng service-role.
 * - Database RPC vẫn tự kiểm tra users.manage để bảo vệ thêm một lớp.
 */

import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

/**
 * Role code động do database quản lý.
 *
 * Ví dụ: admin, employee, sales, tour_operator.
 * Database RPC mới là nơi kiểm tra role có hợp lệ hay không.
 */
export type ManagedRoleCode = string;

/**
 * Role nhân viên động có thể cấu hình permission.
 *
 * UI và database sẽ chặn role hệ thống như admin/super_admin.
 */
export type EditableRoleCode = string;

/** Dữ liệu một user trả về cho màn hình quản lý quyền. */
export type AccessControlUser = {
    user_id: string;
    email: string | null;
    display_name: string | null;
    is_active: boolean;
    role_code: ManagedRoleCode | null;
};

/** Dữ liệu một role và danh sách permission đi kèm. */
export type AccessControlRole = {
    role_code: ManagedRoleCode;
    role_label: string;
    role_description: string | null;
    permission_codes: string[];
};

/**
 * Role nhân viên động do Admin tạo từ Access Control.
 *
 * Không dùng cho admin, super_admin hoặc employee chuyển tiếp.
 */
export type AccessControlStaffRole = {
    role_code: string;
    role_label: string;
    role_description: string | null;
    is_active: boolean;
    sort_order: number;
    permission_codes: string[];
    assigned_user_count: number;
};

/** Dữ liệu thô PostgreSQL trả về từ RPC role nhân viên. */
type AccessControlStaffRoleRow = {
    role_code: string;
    role_label: string;
    role_description: string | null;
    is_active: boolean;
    sort_order: number | string;
    permission_codes: string[] | null;
    assigned_user_count: number | string;
};

/** Dữ liệu một permission để hiển thị checkbox trên UI. */
export type AccessControlPermission = {
    permission_code: string;
    permission_description: string;
};
/**
 * Một chức vụ động trong Access Control.
 *
 * permissionCodes là quyền mẫu của chức vụ.
 * assignedUserCount cho biết hiện có bao nhiêu nhân viên đang được gán.
 */
export type AccessControlJobPosition = {
    position_code: string;
    position_label: string;
    position_description: string | null;
    is_active: boolean;
    sort_order: number;
    permission_codes: string[];
    assigned_user_count: number;
};

/** Bộ lọc role cho danh sách user. */
export type AccessControlUserRoleFilter =
    | ManagedRoleCode
    | 'unassigned'
    | null;

/** Dữ liệu user trả về từ RPC phân trang. */
type AccessControlUserPageRow = AccessControlUser & {
    total_count: number | string;
};

/** Dữ liệu thống kê raw từ PostgreSQL. */
type AccessControlUserSummaryRow = {
    total_users: number | string;
    active_users: number | string;
    admin_count: number | string;
    employee_count: number | string;
    unassigned_count: number | string;
};

/** Dữ liệu thống kê đã đổi về number để frontend dùng dễ hơn. */
export type AccessControlUserSummary = {
    totalUsers: number;
    activeUsers: number;
    adminCount: number;
    employeeCount: number;
    unassignedCount: number;
};

/** Kết quả danh sách user theo từng trang. */
export type AccessControlUsersPage = {
    items: AccessControlUser[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

/** Một dòng raw trả về từ RPC lịch sử phân quyền. */
type AccessControlAuditLogRow = {
    id: number | string;
    action: string;
    actor_email: string | null;
    actor_display_name: string | null;
    target_email: string | null;
    target_display_name: string | null;
    before_value: unknown;
    after_value: unknown;
    created_at: string;
    total_count: number | string;
};

/** Dữ liệu lịch sử đã đổi sang camelCase để frontend dùng. */
export type AccessControlAuditLog = {
    id: number;
    action: string;
    actorEmail: string | null;
    actorDisplayName: string | null;
    targetEmail: string | null;
    targetDisplayName: string | null;
    beforeValue: Record<string, unknown>;
    afterValue: Record<string, unknown>;
    createdAt: string;
};

/** Kết quả lịch sử có phân trang. */
export type AccessControlAuditLogsPage = {
    items: AccessControlAuditLog[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

/** JSON audit luôn mong đợi là object; dữ liệu lỗi thì trả object rỗng. */
function toAuditValue(
    value: unknown,
): Record<string, unknown> {
    if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    ) {
        return value as Record<string, unknown>;
    }

    return {};
}

/** Chuyển bigint PostgreSQL thành number JavaScript an toàn cho UI. */
function toNumber(value: number | string): number {
    const result = Number(value);

    return Number.isFinite(result) ? result : 0;
}

/**
 * Error riêng của RPC.
 * API dùng code PostgreSQL để trả về HTTP 400 hoặc 403 phù hợp.
 */
export class AccessControlRpcError extends Error {
    constructor(
        public readonly code: string | undefined,
        message: string,
    ) {
        super(message);
        this.name = 'AccessControlRpcError';
    }
}

/** Tạo Supabase server client mang cookie của user đang gửi request. */
function createAccessControlServerClient() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    if (!url || !key) {
        throw new Error('Supabase URL hoặc anon key chưa được cấu hình.');
    }

    const cookieStore = cookies();

    return createServerClient(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll() {
                // API này không cần ghi hoặc refresh cookie.
            },
        },
    });
}

/** Ném lỗi có mã PostgreSQL để Route Handler xử lý đúng HTTP status. */
function throwRpcError(error: {
    code?: string;
    message: string;
} | null) {
    if (!error) return;

    throw new AccessControlRpcError(
        error.code,
        error.message,
    );
}

/**
 * Lấy dữ liệu cho tab Role & quyền.
 *
 * Danh sách user không lấy ở đây nữa.
 * Tab Người dùng dùng API phân trang riêng để phù hợp khi có nhiều nhân viên.
 */
export async function getAccessControlData() {
    const supabase = createAccessControlServerClient();

    const [rolesResult, permissionsResult] = await Promise.all([
        supabase.rpc('list_access_control_roles'),
        supabase.rpc('list_access_control_permissions'),
    ]);

    throwRpcError(rolesResult.error);
    throwRpcError(permissionsResult.error);

    return {
        roles: (rolesResult.data ?? []) as AccessControlRole[],
        permissions: (
            permissionsResult.data ?? []
        ) as AccessControlPermission[],
    };
}

/**
 * Lấy role nhân viên động để cấu hình permission và gán cho user.
 */
export async function getAccessControlStaffRoles(): Promise<
    AccessControlStaffRole[]
> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_access_control_staff_roles',
    );

    throwRpcError(result.error);

    return (
        (result.data ?? []) as AccessControlStaffRoleRow[]
    ).map((role) => ({
        role_code: role.role_code,
        role_label: role.role_label,
        role_description: role.role_description,
        is_active: role.is_active,
        sort_order: toNumber(role.sort_order),
        permission_codes: role.permission_codes ?? [],
        assigned_user_count: toNumber(role.assigned_user_count),
    }));
}

/**
 * Tạo role nhân viên động.
 *
 * code không đổi sau khi tạo vì được dùng trong user_roles
 * và role_permissions.
 */
export async function createAccessControlStaffRole(input: {
    code: string;
    label: string;
    description?: string;
    sortOrder?: number;
}): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'create_access_control_staff_role',
        {
            input_code: input.code,
            input_label: input.label,
            input_description: input.description ?? null,
            input_sort_order: input.sortOrder ?? 0,
        },
    );

    throwRpcError(result.error);
}

/**
 * Sửa tên, mô tả, thứ tự hoặc trạng thái hoạt động của role nhân viên.
 */
export async function updateAccessControlStaffRole(input: {
    code: string;
    label: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
}): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'update_access_control_staff_role',
        {
            target_role_code: input.code,
            new_label: input.label,
            new_description: input.description ?? null,
            new_sort_order: input.sortOrder,
            new_is_active: input.isActive,
        },
    );

    throwRpcError(result.error);
}

/**
 * Thay toàn bộ permission của một role nhân viên bằng danh sách mới.
 */
export async function replaceAccessControlStaffRolePermissions(
    roleCode: string,
    permissionCodes: string[],
): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'replace_access_control_staff_role_permissions',
        {
            target_role_code: roleCode,
            requested_permission_codes: permissionCodes,
        },
    );

    throwRpcError(result.error);
}

/** Dữ liệu thô PostgreSQL trả về từ RPC chức vụ. */
type AccessControlJobPositionRow = {
    position_code: string;
    position_label: string;
    position_description: string | null;
    is_active: boolean;
    sort_order: number | string;
    permission_codes: string[] | null;
    assigned_user_count: number | string;
};

/**
 * Lấy danh sách chức vụ để hiển thị trên Access Control.
 *
 * RPC tự kiểm tra users.manage ở database.
 */
export async function getAccessControlJobPositions(): Promise<
    AccessControlJobPosition[]
> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_access_control_job_positions',
    );

    throwRpcError(result.error);

    return (
        (result.data ?? []) as AccessControlJobPositionRow[]
    ).map((position) => ({
        position_code: position.position_code,
        position_label: position.position_label,
        position_description: position.position_description,
        is_active: position.is_active,
        sort_order: toNumber(position.sort_order),
        permission_codes: position.permission_codes ?? [],
        assigned_user_count: toNumber(position.assigned_user_count),
    }));
}

/**
 * Tạo một chức vụ mới.
 *
 * code là mã kỹ thuật ổn định, ví dụ sales hoặc tour_operator.
 * label là tên người dùng nhìn thấy trên giao diện.
 */
export async function createAccessControlJobPosition(input: {
    code: string;
    label: string;
    description?: string;
    sortOrder?: number;
}): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'create_access_control_job_position',
        {
            input_code: input.code,
            input_label: input.label,
            input_description: input.description ?? null,
            input_sort_order: input.sortOrder ?? 0,
        },
    );

    throwRpcError(result.error);
}

/**
 * Cập nhật thông tin hoặc trạng thái sử dụng của một chức vụ.
 *
 * Không đổi code vì code được dùng làm khóa liên kết trong database.
 */
export async function updateAccessControlJobPosition(input: {
    code: string;
    label: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
}): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'update_access_control_job_position',
        {
            target_code: input.code,
            new_label: input.label,
            new_description: input.description ?? null,
            new_sort_order: input.sortOrder,
            new_is_active: input.isActive,
        },
    );

    throwRpcError(result.error);
}

/**
 * Thay toàn bộ permission của một chức vụ bằng danh sách checkbox mới.
 */
export async function replaceAccessControlJobPositionPermissions(
    positionCode: string,
    permissionCodes: string[],
): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'replace_job_position_permissions',
        {
            target_position_code: positionCode,
            requested_permission_codes: permissionCodes,
        },
    );

    throwRpcError(result.error);
}

/**
 * Gán hoặc bỏ chức vụ của một Employee.
 *
 * positionCode null nghĩa là bỏ phân công chức vụ.
 */
export async function setAccessControlUserPosition(
    userId: string,
    positionCode: string | null,
): Promise<void> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'set_access_control_user_position',
        {
            target_user_id: userId,
            new_position_code: positionCode,
        },
    );

    throwRpcError(result.error);
}

/** Đổi role của một user. */
export async function setAccessControlUserRole(
    userId: string,
    roleCode: ManagedRoleCode,
) {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc('set_user_role', {
        target_user_id: userId,
        new_role_code: roleCode,
    });

    throwRpcError(result.error);
}

/** Sửa tên hiển thị của một user. */
export async function updateAccessControlUserProfile(
    userId: string,
    displayName: string,
) {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'update_access_control_user_profile',
        {
            target_user_id: userId,
            new_display_name: displayName,
        },
    );

    throwRpcError(result.error);
}

/** Kích hoạt hoặc vô hiệu hóa một user. */
export async function setAccessControlUserActive(
    userId: string,
    isActive: boolean,
) {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'set_access_control_user_active',
        {
            target_user_id: userId,
            new_is_active: isActive,
        },
    );

    throwRpcError(result.error);
}

/**
 * Khôi phục tài khoản đã từng bị xóa mềm trong quá khứ.
 *
 * Chức năng xóa mới đã bị bỏ khỏi giao diện/API,
 * nhưng giữ hàm này để có thể cứu dữ liệu cũ khi cần.
 */
export async function restoreAccessControlUser(
    userId: string,
) {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'restore_access_control_user',
        {
            target_user_id: userId,
        },
    );

    throwRpcError(result.error);
}

/**
 * Lấy danh sách user theo trang.
 *
 * Hàm này phục vụ bảng user khi số nhân viên tăng.
 * Không tải toàn bộ user cùng lúc.
 */
export async function getAccessControlUsersPage(input: {
    searchText?: string;
    roleCode?: AccessControlUserRoleFilter;
    isActive?: boolean;
    page: number;
    pageSize: number;
}): Promise<AccessControlUsersPage> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_access_control_users_page',
        {
            search_text: input.searchText || null,
            filter_role_code: input.roleCode || null,
            filter_is_active:
                input.isActive === undefined ? null : input.isActive,
            page_number: input.page,
            page_size: input.pageSize,
        },
    );

    throwRpcError(result.error);

    const rows = (
        result.data ?? []
    ) as AccessControlUserPageRow[];

    const totalCount =
        rows.length > 0
            ? toNumber(rows[0].total_count)
            : 0;

    return {
        // Bỏ total_count của từng row vì frontend chỉ cần một totalCount.
        items: rows.map((row) => ({
            user_id: row.user_id,
            email: row.email,
            display_name: row.display_name,
            is_active: row.is_active,
            role_code: row.role_code,
        })),
        totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(
            1,
            Math.ceil(totalCount / input.pageSize),
        ),
    };
}

/**
 * Lấy lịch sử đổi role và permission theo trang.
 *
 * RPC trong database kiểm tra users.manage.
 * API ở bước sau cũng kiểm tra lại quyền này.
 */
export async function getAccessControlAuditLogs(input: {
    page: number;
    pageSize: number;
}): Promise<AccessControlAuditLogsPage> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_access_control_audit_logs',
        {
            page_number: input.page,
            page_size: input.pageSize,
        },
    );

    throwRpcError(result.error);

    const rows = (
        result.data ?? []
    ) as AccessControlAuditLogRow[];

    const totalCount =
        rows.length > 0
            ? toNumber(rows[0].total_count)
            : 0;

    return {
        items: rows.map((row) => ({
            id: toNumber(row.id),
            action: row.action,
            actorEmail: row.actor_email,
            actorDisplayName: row.actor_display_name,
            targetEmail: row.target_email,
            targetDisplayName: row.target_display_name,
            beforeValue: toAuditValue(row.before_value),
            afterValue: toAuditValue(row.after_value),
            createdAt: row.created_at,
        })),
        totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(
            1,
            Math.ceil(totalCount / input.pageSize),
        ),
    };
}

/**
 * Lấy số lượng user theo role để hiển thị các thẻ thống kê.
 */
export async function getAccessControlUserSummary(): Promise<AccessControlUserSummary> {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc(
        'get_access_control_user_summary',
    );

    throwRpcError(result.error);

    const row = (
        result.data ?? []
    )[0] as AccessControlUserSummaryRow | undefined;

    return {
        totalUsers: toNumber(row?.total_users ?? 0),
        activeUsers: toNumber(row?.active_users ?? 0),
        adminCount: toNumber(row?.admin_count ?? 0),
        employeeCount: toNumber(row?.employee_count ?? 0),
        unassignedCount: toNumber(row?.unassigned_count ?? 0),
    };
}

/** Thay toàn bộ permission của role admin hoặc employee. */
export async function replaceAccessControlRolePermissions(
    roleCode: EditableRoleCode,
    permissionCodes: string[],
) {
    const supabase = createAccessControlServerClient();

    const result = await supabase.rpc('replace_role_permissions', {
        target_role_code: roleCode,
        requested_permission_codes: permissionCodes,
    });

    throwRpcError(result.error);
}
