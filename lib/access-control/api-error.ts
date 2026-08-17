/**
 * Contract lỗi dùng chung giữa Access Control API và client.
 *
 * API luôn trả errorCode ổn định; UI dựa vào mã này để dịch EN/VI.
 * Trường error giữ lại thông điệp an toàn phục vụ client cũ và chẩn đoán.
 */

export const ACCESS_CONTROL_ERROR_CODES = [
    'AUTH_UNAUTHORIZED',
    'ACCESS_DENIED',
    'INVALID_ACCESS_CONTROL_REQUEST',
    'INVALID_USER_CREATE_REQUEST',
    'INVALID_USER_UPDATE_REQUEST',
    'INVALID_USER_LIST_FILTER',
    'INVALID_STAFF_ROLE_REQUEST',
    'INVALID_STAFF_ROLE_UPDATE_REQUEST',
    'INVALID_STAFF_ROLE_CODE',
    'INVALID_AUDIT_LOG_QUERY',
    'INVALID_LOGIN_HISTORY_FILTER',
    'USER_EMAIL_UNAVAILABLE',
    'RESERVED_EMAIL_FORBIDDEN',
    'AUTH_ADMIN_UNAVAILABLE',
    'PERMISSION_CODE_EXISTS',
    'ROLE_CODE_EXISTS',
    'ROLE_IN_USE',
    'ACCESS_CONTROL_REQUEST_FAILED',
    'USER_OPERATION_FAILED',
    'STAFF_ROLE_OPERATION_FAILED',
    'AUDIT_LOG_LOAD_FAILED',
    'LOGIN_HISTORY_LOAD_FAILED',
    'LOGIN_HISTORY_FORBIDDEN',
    'SUPER_ADMIN_STATUS_FAILED',
] as const;

export type AccessControlErrorCode =
    (typeof ACCESS_CONTROL_ERROR_CODES)[number];

export type AccessControlErrorBody = {
    ok: false;
    errorCode: AccessControlErrorCode;
    error: string;
};

/** Tạo payload lỗi nhất quán; Route Handler vẫn quyết định HTTP status. */
export function accessControlError(
    errorCode: AccessControlErrorCode,
    error: string,
): AccessControlErrorBody {
    return {
        ok: false,
        errorCode,
        error,
    };
}

/** Phân biệt rõ session chưa đăng nhập (401) với thiếu quyền (403). */
export function accessControlPermissionError(
    status: number,
): AccessControlErrorBody {
    return accessControlError(
        status === 401 ? 'AUTH_UNAUTHORIZED' : 'ACCESS_DENIED',
        'Unauthorized',
    );
}
