import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  customerCreateBodySchema,
  customerListQuerySchema,
  optionalCustomerQueryParam,
} from '@/lib/customers/customer-list-input';
import {
  createCustomer,
  CustomerRepositoryError,
  listCustomersPage,
} from '@/lib/customers/customer-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const permission = await checkPermissionForRequest('customers.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem danh sách khách hàng.',
      },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = customerListQuerySchema.safeParse({
    page: optionalCustomerQueryParam(url, 'page'),
    pageSize: optionalCustomerQueryParam(url, 'pageSize'),
    q: optionalCustomerQueryParam(url, 'q'),
    source: optionalCustomerQueryParam(url, 'source'),
    country: optionalCustomerQueryParam(url, 'country'),
    salesperson: optionalCustomerQueryParam(url, 'salesperson'),
    clientType: optionalCustomerQueryParam(url, 'clientType'),
    agentId: optionalCustomerQueryParam(url, 'agentId'),
    stage: optionalCustomerQueryParam(url, 'stage'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Thông tin phân trang hoặc bộ lọc không hợp lệ.',
      },
      { status: 400 },
    );
  }

  try {
    const customerPage = await listCustomersPage(parsed.data);

    return NextResponse.json(
      {
        ok: true,
        ...customerPage,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      console.error('Không thể lấy danh sách khách hàng:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy danh sách khách hàng:', error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải danh sách khách hàng.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const permission = await checkPermissionForRequest('customers.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền tạo khách hàng.',
      },
      { status: permission.status },
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

  const parsed = customerCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu khách hàng không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const result = await createCustomer(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        customer: result.customer,
        lead: result.lead ?? null,
        comm: result.comm ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'duplicate_email') {
        return NextResponse.json(
          {
            ok: false,
            error: error.message,
            existing: error.existing ?? null,
          },
          { status: 409 },
        );
      }
      console.error('Không thể tạo khách hàng:', error.message);
    } else {
      console.error('Lỗi không xác định khi tạo khách hàng:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tạo khách hàng.' },
      { status: 500 },
    );
  }
}
