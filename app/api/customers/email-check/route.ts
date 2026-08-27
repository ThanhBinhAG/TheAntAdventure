import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  customerEmailCheckQuerySchema,
  optionalCustomerQueryParam,
} from '@/lib/customers/customer-list-input';
import { findDuplicateCustomerEmail } from '@/lib/customers/customer-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'customers/email-check', route: '/api/customers/email-check' },
  async (request, _context, { logger }) => {
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
    logger.error({ event: 'customers.email_check.failed', err: error }, 'Customer email check failed');

    return NextResponse.json(
      { ok: false, error: 'Không thể kiểm tra email.' },
      { status: 500 },
    );
  }
  },
);
