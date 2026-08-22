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

import { getServerSupabaseClient } from '@/lib/supabase/server';
import { invalidatePermissionCache } from '@/lib/redis/permissions';
import {
    getCachedAccessControlStaffRoles,
    invalidateAccessControlStaffRolesCache,
    setCachedAccessControlStaffRoles,
} from '@/lib/redis/access-control-staff-roles';


type AuthLoginEventRow = {
    id: number | string;
    user_id: string | null;
    user_email: string | null;
    user_display_name: string | null;
    event_type: string;
    auth_method: 'password' | 'break_glass';
    ip_address: string | null;
    browser_name: string;
    operating_system: string;
    device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    created_at: string;
    total_count: number | string;
};

export type AuthLoginEventsPage = {
    items: Array<{
        id: number;
        userId: string | null;
        userEmail: string | null;
        userDisplayName: string | null;
        eventType: string;
        authMethod: 'password' | 'break_glass';
        ipAddress: string | null;
        browserName: string;
        operatingSystem: string;
        deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
        createdAt: string;
    }>;
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

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
 * Role có thể cấu hình cho nhân viên.
 *
 * Bao gồm employee và các role mới như Sale, Điều hành...
 * Không dùng cho role hệ thống admin và super_admin.
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

export type AccessControlRoleResourceScope = {
    role_code: string;
    resource_code: string;
    action: string;
    scope: string;
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
    group_code: string;
    group_label: string;
    group_sort_order: number;
};

export type CreateAccessControlPermissionInput = {
    code: string;
    description: string;
    groupCode: string;
    groupLabel: string;
    groupSortOrder?: number;
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

/** Tạo Supabase server client mang access token từ CRM session hiện tại. */
async function createAccessControlServerClient() {
    return getServerSupabaseClient();
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
    const supabase = await createAccessControlServerClient();

    const [
        rolesResult,
        permissionsResult,
        superAdminResult,
    ] = await Promise.all([
        supabase.rpc('list_access_control_roles'),
        supabase.rpc('list_access_control_permissions'),
        supabase.rpc('is_current_super_admin'),
    ]);

    throwRpcError(rolesResult.error);
    throwRpcError(permissionsResult.error);
    throwRpcError(superAdminResult.error);

    return {
        roles: (rolesResult.data ?? []) as AccessControlRole[],
        permissions: (
            permissionsResult.data ?? []
        ) as AccessControlPermission[],
        canCreatePermission: Boolean(superAdminResult.data),
    };
}

/**
 * Lấy role nhân viên động để cấu hình permission và gán cho user.
 */
export async function getAccessControlStaffRoles(): Promise<
    AccessControlStaffRole[]
> {
    const cached = await getCachedAccessControlStaffRoles();
    if (cached !== undefined) return cached;

    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_access_control_staff_roles',
    );

    throwRpcError(result.error);

    const roles = (
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

    await setCachedAccessControlStaffRoles(roles);
    return roles;
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
    const supabase = await createAccessControlServerClient();

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
    await invalidateAccessControlStaffRolesCache();
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
    const supabase = await createAccessControlServerClient();

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
    await invalidateAccessControlStaffRolesCache();
}

/**
 * Xóa một role nhân viên động không còn được gán cho user nào.
 *
 * RPC là lớp quyết định cuối cùng: UI chỉ hỗ trợ trải nghiệm, không được phép
 * tự tin rằng số nhân viên hiển thị vẫn đúng tại thời điểm xóa.
 */
export async function deleteAccessControlStaffRole(
    roleCode: string,
): Promise<void> {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'delete_access_control_staff_role',
        { target_role_code: roleCode },
    );

    throwRpcError(result.error);
    await invalidateAccessControlStaffRolesCache();
}

/**
 * Thay toàn bộ permission của một role nhân viên bằng danh sách mới.
 */
export async function replaceAccessControlStaffRolePermissions(
    roleCode: string,
    permissionCodes: string[],
): Promise<void> {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'replace_access_control_staff_role_permissions',
        {
            target_role_code: roleCode,
            requested_permission_codes: permissionCodes,
        },
    );

    throwRpcError(result.error);
    await invalidatePermissionCache();
    await invalidateAccessControlStaffRolesCache();
}

/** Lấy các scope RLS đã cấu hình; RPC vẫn kiểm tra users.manage. */
export async function getAccessControlStaffRoleResourceScopes(): Promise<
    AccessControlRoleResourceScope[]
> {
    const supabase = await createAccessControlServerClient();
    const result = await supabase.rpc(
        'list_access_control_staff_role_resource_scopes',
    );

    throwRpcError(result.error);
    return (result.data ?? []) as AccessControlRoleResourceScope[];
}

/** Thay toàn bộ scope RLS của một role nhân viên động. */
export async function replaceAccessControlStaffRoleResourceScopes(
    roleCode: string,
    scopes: Array<{
        resourceCode: string;
        action: string;
        scope: string;
    }>,
): Promise<void> {
    const supabase = await createAccessControlServerClient();
    const result = await supabase.rpc(
        'replace_access_control_staff_role_resource_scopes',
        {
            target_role_code: roleCode,
            requested_scopes: scopes.map((scope) => ({
                resource_code: scope.resourceCode,
                action: scope.action,
                scope: scope.scope,
            })),
        },
    );

    throwRpcError(result.error);
    await invalidatePermissionCache();
    await invalidateAccessControlStaffRolesCache();
}

/** Đổi role của một user. */
export async function setAccessControlUserRole(
    userId: string,
    roleCode: ManagedRoleCode,
) {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc('set_user_role', {
        target_user_id: userId,
        new_role_code: roleCode,
    });

    throwRpcError(result.error);
    await invalidatePermissionCache();
    await invalidateAccessControlStaffRolesCache();
}

/** Sửa tên hiển thị của một user. */
export async function updateAccessControlUserProfile(
    userId: string,
    displayName: string,
) {
    const supabase = await createAccessControlServerClient();

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
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'set_access_control_user_active',
        {
            target_user_id: userId,
            new_is_active: isActive,
        },
    );

    throwRpcError(result.error);
    await invalidatePermissionCache();
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
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'restore_access_control_user',
        {
            target_user_id: userId,
        },
    );

    throwRpcError(result.error);
    await invalidatePermissionCache();
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
    const supabase = await createAccessControlServerClient();

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
    const supabase = await createAccessControlServerClient();

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
 * Kiểm tra chính xác role của session hiện tại là super_admin.
 *
 * Không thay bằng users.manage vì Admin thường cũng có thể có quyền đó,
 * còn lịch sử IP/thiết bị chỉ dành cho Super Admin.
 */
export async function isCurrentAccessControlSuperAdmin(): Promise<boolean> {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc('is_current_super_admin');

    throwRpcError(result.error);

    return Boolean(result.data);
}

/** Lấy lịch sử đăng nhập đã phân trang từ RPC bảo mật. */
export async function getAuthLoginEvents(input: {
    page: number;
    pageSize: number;
    userId?: string;
    userQuery?: string;
    ipAddress?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    from?: string;
    to?: string;
}): Promise<AuthLoginEventsPage> {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'list_auth_login_events',
        {
            page_number: input.page,
            page_size: input.pageSize,
            filter_user_id: input.userId ?? null,
            filter_user_query: input.userQuery ?? null,
            filter_ip_address: input.ipAddress ?? null,
            filter_device_type: input.deviceType ?? null,
            filter_from: input.from ?? null,
            filter_to: input.to ?? null,
        },
    );

    throwRpcError(result.error);

    const rows = (result.data ?? []) as AuthLoginEventRow[];
    const totalCount = rows.length > 0
        ? toNumber(rows[0].total_count)
        : 0;

    return {
        items: rows.map((row) => ({
            id: toNumber(row.id),
            userId: row.user_id,
            userEmail: row.user_email,
            userDisplayName: row.user_display_name,
            eventType: row.event_type,
            authMethod: row.auth_method,
            ipAddress: row.ip_address,
            browserName: row.browser_name,
            operatingSystem: row.operating_system,
            deviceType: row.device_type,
            createdAt: row.created_at,
        })),
        totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.max(1, Math.ceil(totalCount / input.pageSize)),
    };
}

/** Thay toàn bộ permission của role admin hoặc employee. */
export async function replaceAccessControlRolePermissions(
    roleCode: EditableRoleCode,
    permissionCodes: string[],
) {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc('replace_role_permissions', {
        target_role_code: roleCode,
        requested_permission_codes: permissionCodes,
    });

    throwRpcError(result.error);
    await invalidatePermissionCache();
}

export async function createAccessControlPermission(
    input: CreateAccessControlPermissionInput,
): Promise<void> {
    const supabase = await createAccessControlServerClient();

    const result = await supabase.rpc(
        'create_access_control_permission',
        {
            input_code: input.code,
            input_description: input.description,
            input_group_code: input.groupCode,
            input_group_label: input.groupLabel,
            input_group_sort_order: input.groupSortOrder ?? null,
        },
    );

    throwRpcError(result.error);
    await invalidatePermissionCache();
}
