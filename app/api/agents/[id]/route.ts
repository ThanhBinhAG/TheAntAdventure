import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { agentPatchBodySchema } from '@/lib/agents/agent-list-input';
import {
  AgentRepositoryError,
  deleteAgent,
  getAgentById,
  updateAgent,
} from '@/lib/agents/agent-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withHttpRequestLogging<RouteContext>(
  { scope: 'agents/detail', route: '/api/agents/[id]' },
  async (_request, context, { logger }) => {
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
      logger.error({ event: 'agents.get.failed', err: error }, 'Agent lookup failed');
    } else {
      logger.error({ event: 'agents.get.failed', err: error }, 'Agent lookup failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tải đại lý.' },
      { status: 500 },
    );
  }
  },
);

export const PATCH = withHttpRequestLogging<RouteContext>(
  { scope: 'agents/detail', route: '/api/agents/[id]' },
  async (request, context, { logger }) => {
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
      logger.error({ event: 'agents.update.failed', err: error }, 'Agent update failed');
    } else {
      logger.error({ event: 'agents.update.failed', err: error }, 'Agent update failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể cập nhật đại lý.' },
      { status: 500 },
    );
  }
  },
);

export const DELETE = withHttpRequestLogging<RouteContext>(
  { scope: 'agents/detail', route: '/api/agents/[id]' },
  async (_request, context, { logger }) => {
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
      logger.error({ event: 'agents.delete.failed', err: error }, 'Agent deletion failed');
    } else {
      logger.error({ event: 'agents.delete.failed', err: error }, 'Agent deletion failed');
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể xóa đại lý.' },
      { status: 500 },
    );
  }
  },
);
