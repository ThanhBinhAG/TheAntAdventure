import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  LeadRepositoryError,
  confirmLead,
} from '@/lib/sales/lead-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const POST = withHttpRequestLogging<RouteContext>(
  { scope: 'sales/leads/confirm', route: '/api/leads/[id]/confirm' },
  async (_request, context, { logger }) => {
  const permission = await checkPermissionForRequest('sales.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xác nhận lead.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu mã lead.' },
      { status: 400 },
    );
  }

  try {
    const result = await confirmLead(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof LeadRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      logger.error({ event: 'sales.leads.confirm.failed', err: error }, 'Lead confirmation failed');
    } else {
      logger.error({ event: 'sales.leads.confirm.failed', err: error }, 'Lead confirmation failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể xác nhận lead.' },
      { status: 500 },
    );
  }
  },
);
