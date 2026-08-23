import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  customerEmailCheckQuerySchema,
  optionalCustomerQueryParam,
} from '@/lib/customers/customer-list-input';
import {
  CustomerRepositoryError,
  findDuplicateCustomerEmail,
} from '@/lib/customers/customer-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const permission = await checkPermissionForRequest('customers.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền kiểm tra email khách hàng.',
      },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = customerEmailCheckQuerySchema.safeParse({
    email: optionalCustomerQueryParam(url, 'email'),
    excludeId: optionalCustomerQueryParam(url, 'excludeId'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Email không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const existing = await findDuplicateCustomerEmail(
      parsed.data.email,
      parsed.data.excludeId,
    );

    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          available: false,
          existing: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { ok: true, available: true, existing: null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      console.error('Không thể kiểm tra email khách hàng:', error.message);
    } else {
      console.error('Lỗi không xác định khi kiểm tra email khách hàng:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể kiểm tra email.' },
      { status: 500 },
    );
  }
}
