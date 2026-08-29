import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  dashboardQuerySchema,
  optionalDashboardQueryParam,
} from '@/lib/dashboard/dashboard-input';
import {
  DashboardRepositoryError,
  getDashboardPage,
} from '@/lib/dashboard/dashboard-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'dashboard', route: '/api/dashboard' },
  async (request, _context, { logger }) => {
  const permission = await checkPermissionForRequest('dashboard.read');
  if (!permission.allowed) {
    logger.warn({ event: 'dashboard.permission.denied', statusCode: permission.status }, 'Dashboard permission denied');
    return NextResponse.json(
      { error: 'Bạn không có quyền xem Dashboard.' },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = dashboardQuerySchema.safeParse({
    clientType: optionalDashboardQueryParam(url, 'clientType') ?? '',
    market: optionalDashboardQueryParam(url, 'market') ?? '',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Bộ lọc không hợp lệ.' },
      { status: 422 },
    );
  }

  try {
    const payload = await getDashboardPage({
      clientType: parsed.data.clientType,
      market: parsed.data.market,
    });
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (err) {
    logger.error({ event: 'dashboard.load.failed', err }, 'Dashboard load failed');
    if (err instanceof DashboardRepositoryError) {
      const status = err.code === 'config' ? 503 : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  },
);
