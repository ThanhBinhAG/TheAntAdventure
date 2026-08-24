import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  LeadRepositoryError,
  confirmLead,
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
      console.error('Không thể xác nhận lead:', error.message);
    } else {
      console.error('Lỗi không xác định khi xác nhận lead:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể xác nhận lead.' },
      { status: 500 },
    );
  }
}
