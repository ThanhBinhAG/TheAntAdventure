import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  CustomerRepositoryError,
  getCustomerProfileContext,
} from '@/lib/customers/customer-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('customers.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem khách hàng.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu mã khách hàng.' },
      { status: 400 },
    );
  }

  try {
    const profile = await getCustomerProfileContext(id);
    return NextResponse.json(
      { ok: true, ...profile },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể tải profile khách hàng:', error.message);
    } else {
      console.error('Lỗi không xác định khi tải profile khách hàng:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải profile khách hàng.' },
      { status: 500 },
    );
  }
}
