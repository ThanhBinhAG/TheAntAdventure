import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    isCurrentAccessControlSuperAdmin,
} from '@/lib/access-control/server';
import {
    checkPermissionForRequest,
} from '@/lib/auth/permissions-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Chỉ người đã có quyền vào Access Control mới được hỏi trạng thái này.
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    try {
        const isSuperAdmin =
            await isCurrentAccessControlSuperAdmin();

        return NextResponse.json(
            {
                ok: true,
                isSuperAdmin,
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        const status =
            error instanceof AccessControlRpcError &&
                error.code === '42501'
                ? 403
                : 500;

        return NextResponse.json(
            {
                ok: false,
                error: 'Không thể xác nhận quyền Super Admin.',
            },
            { status },
        );
    }
}