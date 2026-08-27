import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  leadListQuerySchema,
  optionalLeadQueryParam,
} from '@/lib/sales/lead-list-input';
import { listLeadsPage } from '@/lib/sales/lead-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'sales/leads', route: '/api/leads' },
  async (request, _context, { logger }) => {
  const permission = await checkPermissionForRequest('sales.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem Sales Pipeline.',
      },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = leadListQuerySchema.safeParse({
    page: optionalLeadQueryParam(url, 'page'),
    pageSize: optionalLeadQueryParam(url, 'pageSize'),
    q: optionalLeadQueryParam(url, 'q'),
    custId: optionalLeadQueryParam(url, 'custId'),
    stage: optionalLeadQueryParam(url, 'stage'),
    timeMode: optionalLeadQueryParam(url, 'timeMode'),
    travelMonth: optionalLeadQueryParam(url, 'travelMonth'),
    followUpFrom: optionalLeadQueryParam(url, 'followUpFrom'),
    followUpTo: optionalLeadQueryParam(url, 'followUpTo'),
    sortField: optionalLeadQueryParam(url, 'sortField'),
    sortDirection: optionalLeadQueryParam(url, 'sortDirection'),
    scope: optionalLeadQueryParam(url, 'scope'),
    includeLost: optionalLeadQueryParam(url, 'includeLost'),
    highlightLeadId: optionalLeadQueryParam(url, 'highlightLeadId'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Thông tin lọc hoặc phân trang không hợp lệ.',
      },
      { status: 400 },
    );
  }

  try {
    const leadPage = await listLeadsPage(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        ...leadPage,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    logger.error({ event: 'sales.leads.list.failed', err: error }, 'Lead list failed');

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải Sales Pipeline.',
      },
      { status: 500 },
    );
  }
  },
);
