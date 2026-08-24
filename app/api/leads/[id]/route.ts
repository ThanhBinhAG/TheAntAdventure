import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { leadPatchBodySchema } from '@/lib/sales/lead-list-input';
import {
  LeadRepositoryError,
  getLeadById,
  updateLeadRecord,
} from '@/lib/sales/lead-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('sales.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem lead.',
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
    const lead = await getLeadById(id);
    return NextResponse.json(
      { ok: true, lead },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof LeadRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể lấy lead:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy lead:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải lead.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('sales.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền sửa lead.',
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'JSON không hợp lệ.' },
      { status: 400 },
    );
  }

  const parsed = leadPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu cập nhật không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const lead = await updateLeadRecord(id, parsed.data);
    return NextResponse.json({ ok: true, lead });
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
      console.error('Không thể cập nhật lead:', error.message);
    } else {
      console.error('Lỗi không xác định khi cập nhật lead:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể cập nhật lead.' },
      { status: 500 },
    );
  }
}
