import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { customerInquiryBodySchema } from '@/lib/customers/customer-list-input';
import {
  CustomerRepositoryError,
  createCustomerInquiry,
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

  let json: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) json = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON không hợp lệ.' },
      { status: 400 },
    );
  }

  const parsed = customerInquiryBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu inquiry không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const lead = await createCustomerInquiry(id, parsed.data);
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể tạo inquiry:', error.message);
    } else {
      console.error('Lỗi không xác định khi tạo inquiry:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tạo inquiry.' },
      { status: 500 },
    );
  }
}
