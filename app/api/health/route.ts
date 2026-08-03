import { NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/system/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const report = await runHealthCheck();
  const httpStatus = report.status === 'ok' ? 200 : report.status === 'degraded' ? 503 : 503;
  return NextResponse.json(report, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
