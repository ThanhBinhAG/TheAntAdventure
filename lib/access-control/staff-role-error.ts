/** Chuẩn hóa lỗi RPC role nhân viên trước khi API trả về cho giao diện. */
export function getStaffRoleRpcErrorResponse(
    code: string | undefined,
    message: string,
): { status: number; error: string } | null {
    if (code === '42501') return { status: 403, error: message };
    if (code === '22023') return { status: 400, error: message };

    if (code === '23505') {
        return {
            status: 409,
            error: 'Mã role đã tồn tại. Hãy dùng mã khác.',
        };
    }

    return null;
}
