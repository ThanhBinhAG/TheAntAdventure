import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { customerCommCreateBodySchema } from '@/lib/customers/customer-list-input';
import {
  CustomerRepositoryError,
  createCustomerComm,
} from '@/lib/customers/customer-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('customers.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền sửa khách hàng.',
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON không hợp lệ.' },
      { status: 400 },
    );
  }

  const parsed = customerCommCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu communication không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const comm = await createCustomerComm(id, parsed.data);
    return NextResponse.json({ ok: true, comm });
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể ghi communication:', error.message);
    } else {
      console.error('Lỗi không xác định khi ghi communication:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể ghi communication.' },
      { status: 500 },
    );
  }
}
