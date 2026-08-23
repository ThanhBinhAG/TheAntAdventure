import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  agentCreateBodySchema,
  agentListQuerySchema,
  optionalAgentQueryParam,
} from '@/lib/agents/agent-list-input';
import {
  AgentRepositoryError,
  createAgent,
  listAgentsPage,
} from '@/lib/agents/agent-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const permission = await checkPermissionForRequest('agents.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem danh sách đại lý.',
      },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = agentListQuerySchema.safeParse({
    page: optionalAgentQueryParam(url, 'page'),
    pageSize: optionalAgentQueryParam(url, 'pageSize'),
    q: optionalAgentQueryParam(url, 'q'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Thông tin phân trang hoặc tìm kiếm không hợp lệ.',
      },
      { status: 400 },
    );
  }

  try {
    const agentPage = await listAgentsPage(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        ...agentPage,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    if (error instanceof AgentRepositoryError) {
      console.error('Không thể lấy danh sách đại lý:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy danh sách đại lý:', error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải danh sách đại lý.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const permission = await checkPermissionForRequest('agents.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền tạo đại lý.',
      },
      { status: permission.status },
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

  const parsed = agentCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu đại lý không hợp lệ.' },
      { status: 400 },
    );
  }

  try {
    const agent = await createAgent(parsed.data);
    return NextResponse.json({ ok: true, agent }, { status: 201 });
  } catch (error) {
    if (error instanceof AgentRepositoryError) {
      console.error('Không thể tạo đại lý:', error.message);
    } else {
      console.error('Lỗi không xác định khi tạo đại lý:', error);
    }

    return NextResponse.json(
      { ok: false, error: 'Không thể tạo đại lý.' },
      { status: 500 },
    );
  }
}
