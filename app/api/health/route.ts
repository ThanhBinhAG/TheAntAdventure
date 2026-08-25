import { NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/system/health';
import { createHttpRequestLogger } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { requestId, logCompletion } = createHttpRequestLogger(request, {
    scope: 'system/health',
    route: '/api/health',
    healthCheck: true,
  });
  const startedAt = Date.now();
  const report = await runHealthCheck();
  const httpStatus = report.status === 'ok' ? 200 : report.status === 'degraded' ? 503 : 503;
  logCompletion({ statusCode: httpStatus, durationMs: Date.now() - startedAt });
  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}
