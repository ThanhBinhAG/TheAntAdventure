import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  leadListQuerySchema,
  optionalLeadQueryParam,
} from '@/lib/sales/lead-list-input';
import {
  LeadRepositoryError,
  listLeadsPage,
} from '@/lib/sales/lead-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    if (error instanceof LeadRepositoryError) {
      console.error('Không thể lấy danh sách leads:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy danh sách leads:', error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải Sales Pipeline.',
      },
      { status: 500 },
    );
  }
}
