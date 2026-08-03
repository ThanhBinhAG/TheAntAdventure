import { NextResponse } from 'next/server';
import { requireDebugAccess } from '@/lib/system/debug-api';
import { runDiagnostics } from '@/lib/system/run-diagnostics';

export async function GET(request: Request) {
  const denied = requireDebugAccess(request);
  if (denied) return denied;

  const report = await runDiagnostics();
  return NextResponse.json(report);
}
