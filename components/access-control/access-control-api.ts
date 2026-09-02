'use client';

/**
 * File này gọi API phân quyền từ phía trình duyệt.
 *
 * Chức năng:
 * - Lấy role, permission, danh sách user và lịch sử thay đổi từ API.
 * - Gửi yêu cầu tạo, sửa, đổi role và đổi trạng thái user.
 *
 * Lưu ý:
 * - File này không gọi Supabase trực tiếp.
 * - API server mới là nơi kiểm tra users.manage và gọi database RPC.
 */

import type { AccessControlErrorCode } from '@/lib/access-control/api-error';
import type { AppLanguage } from '@/lib/i18n/stages';
import {
    tac,
    type AccessControlKey,
} from '@/lib/i18n/pages/access-control';

/**
 * Role code động được lấy từ database.
 *
 * Ví dụ: admin, sales, tour_operator.
 */
export type ManagedRoleCode = string;

/**
 * Role nhân viên động có thể được cấu hình permission.
 *
 * API/RPC sẽ chặn role hệ thống.
 */
export type EditableRoleCode = string;

/** Dữ liệu user dùng để hiển thị trong bảng. */
export type AccessControlUser = {
    user_id: string;
    email: string | null;
    display_name: string | null;
    is_active: boolean;
    role_code: ManagedRoleCode | null;
};

/** Dữ liệu role trả về từ API. */
export type AccessControlRole = {
    role_code: ManagedRoleCode;
    role_label: string;
    role_description: string | null;
    permission_codes: string[];
};

/**
 * Role có thể hiển thị hoặc gán cho user.
 * is_active giúp UI không gán role đã ngừng dùng.
 */
export type AccessControlAssignableRole = AccessControlRole & {
    is_active: boolean;
};

/**
 * Role nhân viên động trả về từ API.
 *
 * Bao gồm Nhân viên và các role nghiệp vụ tạo thêm.
 * Không bao gồm admin hoặc super_admin.
 */
export type AccessControlStaffRole = {
    role_code: string;
    role_label: string;
    role_description: string | null;
    is_active: boolean;
    sort_order: number;
    permission_codes: string[];
    assigned_user_count: number;
    resource_scopes: AccessControlResourceScope[];
};

export type AccessControlResourceScope = {
    resource_code: 'customers' | 'leads' | 'tour_drafts' | 'bookings' | 'tasks' | 'comms';
    action: 'read' | 'write' | 'delete';
    scope: 'own' | 'all';
};

/** Dữ liệu tạo role nhân viên mới. */
export type CreateAccessControlStaffRoleInput = {
    code: string;
    label: string;
    description?: string;
    sortOrder?: number;
};

/** Dữ liệu permission trả về từ API. */
export type AccessControlPermission = {
    permission_code: string;
    permission_description: string;
    group_code: string;
    group_label: string;
    group_sort_order: number;
};

export type AccessControlData = {
    roles: AccessControlRole[];
    permissions: AccessControlPermission[];
    canCreatePermission: boolean;
};

export type CreateAccessControlPermissionInput = {
    code: string;
    description: string;
    groupCode: string;
    groupLabel: string;
    groupSortOrder?: number;
};

/** Role dùng để lọc danh sách user. */
export type UserListRoleFilter =
    | 'all'
    | ManagedRoleCode
    | 'unassigned';

/** Trạng thái dùng để lọc danh sách user. */
export type UserListStatusFilter =
    | 'all'
    | 'active'
    | 'inactive';

/** Kết quả API danh sách user phân trang. */
export type AccessControlUsersPage = {
    items: AccessControlUser[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

/** Dữ liệu Super Admin nhập khi tạo một tài khoản mới. */
export type CreateAccessControlUserInput = {
    email: string;
    password: string;
    displayName: string;
    roleCode: ManagedRoleCode;
};

/** Một lần thay đổi role hoặc permission. */
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

export type AccessControlSuperAdminStatus = {
    isSuperAdmin: boolean;
};

export type AuthLoginEvent = {
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
};

export type AuthLoginEventsPage = {
    items: AuthLoginEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

type ApiResponse<T> =
    | ({ ok: true } & T)
    | {
        ok: false;
        error?: string;
        errorCode?: AccessControlErrorCode;
    };

/** Lỗi API có mã ổn định để UI không phụ thuộc câu chữ từ server/database. */
export class AccessControlApiError extends Error {
    constructor(
        message: string,
        public readonly code?: AccessControlErrorCode,
        public readonly status?: number,
    ) {
        super(message);
        this.name = 'AccessControlApiError';
    }
}

const ERROR_MESSAGE_KEYS: Record<
    AccessControlErrorCode,
    AccessControlKey
> = {
    AUTH_UNAUTHORIZED: 'unauthorized',
    ACCESS_DENIED: 'accessDenied',
    INVALID_ACCESS_CONTROL_REQUEST: 'invalidRequest',
    INVALID_USER_CREATE_REQUEST: 'invalidRequest',
    INVALID_USER_UPDATE_REQUEST: 'invalidRequest',
    INVALID_USER_LIST_FILTER: 'invalidRequest',
    INVALID_STAFF_ROLE_REQUEST: 'invalidRequest',
    INVALID_STAFF_ROLE_UPDATE_REQUEST: 'invalidRequest',
    INVALID_STAFF_ROLE_CODE: 'invalidRequest',
    INVALID_AUDIT_LOG_QUERY: 'invalidRequest',
    INVALID_LOGIN_HISTORY_FILTER: 'invalidRequest',
    USER_EMAIL_UNAVAILABLE: 'emailUnavailable',
    RESERVED_EMAIL_FORBIDDEN: 'reservedEmailForbidden',
    AUTH_ADMIN_UNAVAILABLE: 'authAdminUnavailable',
    PERMISSION_CODE_EXISTS: 'permissionCodeExists',
    ROLE_CODE_EXISTS: 'roleCodeExists',
    ROLE_IN_USE: 'roleInUse',
    ACCESS_CONTROL_REQUEST_FAILED: 'accessControlRequestFailed',
    USER_OPERATION_FAILED: 'userOperationFailed',
    STAFF_ROLE_OPERATION_FAILED: 'staffRoleOperationFailed',
    AUDIT_LOG_LOAD_FAILED: 'auditLogLoadFailed',
    LOGIN_HISTORY_LOAD_FAILED: 'loadLoginHistoryFailed',
    LOGIN_HISTORY_FORBIDDEN: 'loginHistoryForbidden',
    SUPER_ADMIN_STATUS_FAILED: 'superAdminStatusFailed',
};

/** Dịch lỗi Access Control theo code; lỗi cũ chưa có code giữ nguyên message. */
export function getAccessControlErrorMessage(
    error: unknown,
    language: AppLanguage,
    fallback: AccessControlKey,
): string {
    if (error instanceof AccessControlApiError && error.code) {
        return tac(ERROR_MESSAGE_KEYS[error.code], language);
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return tac(fallback, language);
}

/** Đọc response API và ném lỗi dễ hiểu nếu request thất bại. */
async function readApiResponse<T>(
    response: Response,
): Promise<T> {
    const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

    if (!response.ok || !body.ok) {
        throw new AccessControlApiError(
            'error' in body && body.error
                ? body.error
                : 'Unable to process the access-control request.',
            'errorCode' in body ? body.errorCode : undefined,
            response.status,
        );
    }

    return body as T;
}

export async function createAccessControlPermission(
    input: CreateAccessControlPermissionInput,
): Promise<void> {
    const response = await fetch('/api/access-control', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    await readApiResponse<Record<string, never>>(response);
}

/** Lấy dữ liệu cho toàn bộ trang Access Control. */
export async function fetchAccessControlData(): Promise<AccessControlData> {
    const response = await fetch('/api/access-control', {
        method: 'GET',
        cache: 'no-store',
    });

    return readApiResponse<AccessControlData>(response);
}

/** Lấy danh sách role nhân viên động cho UI. */
export async function fetchAccessControlStaffRoles(): Promise<
    AccessControlStaffRole[]
> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    const data = await readApiResponse<{
        roles: AccessControlStaffRole[];
    }>(response);

    return data.roles;
}

/** Tạo role nhân viên động mới. */
export async function createAccessControlStaffRole(
    input: CreateAccessControlStaffRoleInput,
): Promise<void> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        },
    );

    await readApiResponse<Record<string, never>>(response);
}

/** Sửa thông tin hoặc trạng thái sử dụng của role nhân viên. */
export async function updateAccessControlStaffRole(input: {
    code: string;
    label: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
}): Promise<void> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_role',
                ...input,
            }),
        },
    );

    await readApiResponse<Record<string, never>>(response);
}

/** Xóa role nhân viên động sau khi role không còn được gán cho user nào. */
export async function deleteAccessControlStaffRole(
    code: string,
): Promise<void> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        },
    );

    await readApiResponse<Record<string, never>>(response);
}

/** Lưu toàn bộ permission mới của một role nhân viên. */
export async function updateAccessControlStaffRolePermissions(
    roleCode: string,
    permissionCodes: string[],
): Promise<void> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'replace_role_permissions',
                roleCode,
                permissionCodes,
            }),
        },
    );

    await readApiResponse<Record<string, never>>(response);
}

/** Lưu scope RLS theo resource/action cho role nhân viên động. */
export async function updateAccessControlStaffRoleResourceScopes(
    roleCode: string,
    scopes: AccessControlResourceScope[],
): Promise<void> {
    const response = await fetch(
        '/api/access-control/staff-roles',
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'replace_role_resource_scopes',
                roleCode,
                scopes: scopes.map((scope) => ({
                    resourceCode: scope.resource_code,
                    action: scope.action,
                    scope: scope.scope,
                })),
            }),
        },
    );

    await readApiResponse<Record<string, never>>(response);
}

/** Gửi yêu cầu đổi role cho một user. */
export async function updateUserRole(
    userId: string,
    roleCode: ManagedRoleCode,
): Promise<void> {
    const response = await fetch('/api/access-control', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'set_user_role',
            userId,
            roleCode,
        }),
    });

    await readApiResponse<Record<string, never>>(response);
}

/**
 * Gửi danh sách permission mới cho role admin hoặc employee.
 */
export async function updateRolePermissions(
    roleCode: EditableRoleCode,
    permissionCodes: string[],
): Promise<void> {
    const response = await fetch('/api/access-control', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'replace_role_permissions',
            roleCode,
            permissionCodes,
        }),
    });

    await readApiResponse<Record<string, never>>(response);
}

/**
 * Lấy user theo trang từ API.
 *
 * Chỉ gửi các filter đang được chọn.
 * API server mới là nơi thực hiện tìm kiếm/phân trang thật.
 */
export async function fetchAccessControlUsersPage(input: {
    keyword: string;
    role: UserListRoleFilter;
    status: UserListStatusFilter;
    page: number;
    pageSize: number;
}): Promise<AccessControlUsersPage> {
    const query = new URLSearchParams({
        page: String(input.page),
        pageSize: String(input.pageSize),
    });

    if (input.keyword.trim()) {
        query.set('q', input.keyword.trim());
    }

    if (input.role !== 'all') {
        query.set('role', input.role);
    }

    if (input.status !== 'all') {
        query.set('status', input.status);
    }

    const response = await fetch(
        `/api/access-control/users?${query.toString()}`,
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    return readApiResponse<AccessControlUsersPage>(response);
}

/**
 * Lấy lịch sử đổi role và permission theo trang.
 *
 * API kiểm tra users.manage trước khi gọi RPC database.
 */
export async function fetchAccessControlAuditLogs(input: {
    page: number;
    pageSize: number;
}): Promise<AccessControlAuditLogsPage> {
    const query = new URLSearchParams({
        page: String(input.page),
        pageSize: String(input.pageSize),
    });

    const response = await fetch(
        `/api/access-control/audit-logs?${query.toString()}`,
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    return readApiResponse<AccessControlAuditLogsPage>(response);
}

/** Xác định chính xác session hiện tại có phải Super Admin hay không. */
export async function fetchAccessControlSuperAdminStatus(): Promise<
    AccessControlSuperAdminStatus
> {
    const response = await fetch(
        '/api/access-control/super-admin-status',
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    return readApiResponse<AccessControlSuperAdminStatus>(response);
}

/** Lấy danh sách lịch sử đăng nhập có phân trang. */
/** Lấy lịch sử đăng nhập có phân trang và bộ lọc server-side. */
export async function fetchAuthLoginEvents(input: {
    page: number;
    pageSize: number;
    userQuery?: string;
    ipAddress?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    from?: string;
    to?: string;
}): Promise<AuthLoginEventsPage> {
    const query = new URLSearchParams({
        page: String(input.page),
        pageSize: String(input.pageSize),
    });

    if (input.userQuery?.trim()) {
        query.set('user', input.userQuery.trim());
    }

    if (input.ipAddress?.trim()) {
        query.set('ip', input.ipAddress.trim());
    }

    if (input.deviceType) {
        query.set('deviceType', input.deviceType);
    }

    if (input.from) {
        query.set('from', input.from);
    }

    if (input.to) {
        query.set('to', input.to);
    }

    const response = await fetch(
        `/api/access-control/login-history?${query.toString()}`,
        {
            method: 'GET',
            cache: 'no-store',
        },
    );

    return readApiResponse<AuthLoginEventsPage>(response);
}

/**
 * Các dữ liệu PATCH hợp lệ cho API /api/access-control/users.
 *
 * Giữ type này ở client để component gọi API không phải nhớ
 * action và tên field kỹ thuật.
 */
type UserUpdateRequest =
    | {
        action: 'update_profile';
        userId: string;
        displayName: string;
    }
    | {
        action: 'set_active';
        userId: string;
        isActive: boolean;
    }
    | {
        action: 'change_password';
        userId: string;
        password: string;
    }
    | {
        action: 'restore';
        userId: string;
    };

/** Gửi một thao tác PATCH đến API quản lý user. */
async function sendUserUpdate(
    body: UserUpdateRequest,
): Promise<void> {
    const response = await fetch('/api/access-control/users', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    await readApiResponse<Record<string, never>>(response);
}

/** Sửa tên hiển thị của user. */
export async function updateUserDisplayName(
    userId: string,
    displayName: string,
): Promise<void> {
    await sendUserUpdate({
        action: 'update_profile',
        userId,
        displayName,
    });
}

/** Kích hoạt hoặc vô hiệu hóa user. */
export async function updateUserActiveStatus(
    userId: string,
    isActive: boolean,
): Promise<void> {
    await sendUserUpdate({
        action: 'set_active',
        userId,
        isActive,
    });
}

/** Đổi mật khẩu của user. */
export async function updateUserPassword(
    userId: string,
    password: string,
): Promise<void> {
    await sendUserUpdate({
        action: 'change_password',
        userId,
        password,
    });
}


/**
 * Tạo một tài khoản Auth mới, sau đó API sẽ tự tạo profile và gán role.
 *
 * Mật khẩu chỉ được gửi trong request này, không lưu trong state chung
 * và API cũng không trả mật khẩu về trình duyệt.
 */
export async function createAccessControlUser(
    input: CreateAccessControlUserInput,
): Promise<string> {
    const response = await fetch('/api/access-control/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });

    const result = await readApiResponse<{
        userId: string;
    }>(response);

    return result.userId;
}
