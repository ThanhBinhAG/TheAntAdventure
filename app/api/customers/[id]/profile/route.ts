import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  CustomerRepositoryError,
  getCustomerProfileContext,
} from '@/lib/customers/customer-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withHttpRequestLogging<RouteContext>(
  { scope: 'customers/profile', route: '/api/customers/[id]/profile' },
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
      logger.error({ event: 'customers.profile.failed', err: error }, 'Customer profile load failed');
    } else {
      logger.error({ event: 'customers.profile.failed', err: error }, 'Customer profile load failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải profile khách hàng.' },
      { status: 500 },
    );
  }
  },
);
