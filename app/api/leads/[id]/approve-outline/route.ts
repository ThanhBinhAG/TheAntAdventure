import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  LeadRepositoryError,
  approveLeadOutline,
} from '@/lib/sales/lead-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('sales.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền duyệt outline.',
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
    const result = await approveLeadOutline(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof LeadRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      if (error.code === 'validation') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 400 },
        );
      }
      console.error('Không thể duyệt outline:', error.message);
    } else {
      console.error('Lỗi không xác định khi duyệt outline:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể duyệt outline.' },
      { status: 500 },
    );
  }
}
