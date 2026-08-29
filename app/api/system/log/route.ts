import { NextResponse } from 'next/server';
import type { DebugLogLevel } from '@/lib/system/debug-logger';
import { debugLog } from '@/lib/system/debug-logger';
import { debugNotFound, requireDebugAccess } from '@/lib/system/debug-api';
import { isSystemDebugEnabled } from '@/lib/system/debug-config';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

/** Client auth events during debug — no token (login page has no token yet). Debug mode only. */
export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'system/debug-log', route: '/api/system/log' },
  async (request) => {
  if (!isSystemDebugEnabled()) return debugNotFound();

  let body: { category?: string; message?: string; level?: DebugLogLevel; meta?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.category !== 'auth' || !body.message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  debugLog('auth', body.message, { level: body.level ?? 'info', meta: body.meta });
  return NextResponse.json({ ok: true });
  },
);

/** Token-gated log ingest for other categories */
export const PUT = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'system/debug-log', route: '/api/system/log' },
  async (request) => {
  const denied = requireDebugAccess(request);
  if (denied) return denied;

  let body: { category?: string; message?: string; level?: DebugLogLevel; meta?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.message) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const category = (body.category ?? 'diagnostics') as 'middleware' | 'auth' | 'diagnostics' | 'supabase';
  debugLog(category, body.message, { level: body.level ?? 'info', meta: body.meta });
  return NextResponse.json({ ok: true });
  },
);
