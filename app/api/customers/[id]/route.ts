import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { customerPatchBodySchema } from '@/lib/customers/customer-list-input';
import {
  CustomerRepositoryError,
  deleteCustomer,
  getCustomerById,
  updateCustomer,
} from '@/lib/customers/customer-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withHttpRequestLogging<RouteContext>(
  { scope: 'customers/detail', route: '/api/customers/[id]' },
  async (_request, context, { logger }) => {
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
    const customer = await getCustomerById(id);
    return NextResponse.json(
      { ok: true, customer },
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
      logger.error({ event: 'customers.get.failed', err: error }, 'Customer lookup failed');
    } else {
      logger.error({ event: 'customers.get.failed', err: error }, 'Customer lookup failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải khách hàng.' },
      { status: 500 },
    );
  }
  },
);

export const PATCH = withHttpRequestLogging<RouteContext>(
  { scope: 'customers/detail', route: '/api/customers/[id]' },
  async (request, context, { logger }) => {
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

  const parsed = customerPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu cập nhật không hợp lệ.' },
      { status: 400 },
    );
  }

  if (!parsed.data.form && parsed.data.notes === undefined) {
    return NextResponse.json(
      { ok: false, error: 'Không có trường nào để cập nhật.' },
      { status: 400 },
    );
  }

  try {
    const customer = await updateCustomer(id, parsed.data);
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
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
      logger.error({ event: 'customers.update.failed', err: error }, 'Customer update failed');
    } else {
      logger.error({ event: 'customers.update.failed', err: error }, 'Customer update failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể cập nhật khách hàng.' },
      { status: 500 },
    );
  }
  },
);

export const DELETE = withHttpRequestLogging<RouteContext>(
  { scope: 'customers/detail', route: '/api/customers/[id]' },
  async (_request, context, { logger }) => {
  const permission = await checkPermissionForRequest('customers.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xóa khách hàng.',
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
    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CustomerRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      if (error.code === 'blocked') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 409 },
        );
      }
      logger.error({ event: 'customers.delete.failed', err: error }, 'Customer deletion failed');
    } else {
      logger.error({ event: 'customers.delete.failed', err: error }, 'Customer deletion failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể xóa khách hàng.' },
      { status: 500 },
    );
  }
  },
);
