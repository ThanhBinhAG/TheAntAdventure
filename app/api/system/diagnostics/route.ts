import { NextResponse } from 'next/server';
import { requireDebugAccess } from '@/lib/system/debug-api';
import { runDiagnostics } from '@/lib/system/run-diagnostics';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'system/diagnostics', route: '/api/system/diagnostics' },
  async (request) => {
  const denied = requireDebugAccess(request);
  if (denied) return denied;

  const report = await runDiagnostics();
  return NextResponse.json(report);
  },
);
