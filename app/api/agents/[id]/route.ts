import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { agentPatchBodySchema } from '@/lib/agents/agent-list-input';
import {
  AgentRepositoryError,
  deleteAgent,
  getAgentById,
  updateAgent,
} from '@/lib/agents/agent-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('agents.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem đại lý.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu mã đại lý.' },
      { status: 400 },
    );
  }

  try {
    const agent = await getAgentById(id);
    return NextResponse.json(
      { ok: true, agent },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof AgentRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể lấy đại lý:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy đại lý:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải đại lý.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('agents.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền sửa đại lý.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu mã đại lý.' },
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

  const parsed = agentPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu cập nhật không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const agent = await updateAgent(id, parsed.data);
    return NextResponse.json({ ok: true, agent });
  } catch (error) {
    if (error instanceof AgentRepositoryError) {
      if (error.code === 'not_found') {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 404 },
        );
      }
      console.error('Không thể cập nhật đại lý:', error.message);
    } else {
      console.error('Lỗi không xác định khi cập nhật đại lý:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể cập nhật đại lý.' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('agents.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xóa đại lý.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Thiếu mã đại lý.' },
      { status: 400 },
    );
  }

  try {
    await deleteAgent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AgentRepositoryError) {
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
      console.error('Không thể xóa đại lý:', error.message);
    } else {
      console.error('Lỗi không xác định khi xóa đại lý:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể xóa đại lý.' },
      { status: 500 },
    );
  }
}
