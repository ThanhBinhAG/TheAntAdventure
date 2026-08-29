import { NextResponse } from 'next/server';
import type { DebugLogCategory } from '@/lib/system/debug-logger';
import { getDebugLogs } from '@/lib/system/debug-logger';
import { requireDebugAccess } from '@/lib/system/debug-api';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

const VALID_CATEGORIES = new Set<DebugLogCategory>(['middleware', 'auth', 'diagnostics', 'supabase']);

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'system/debug-logs', route: '/api/system/logs' },
  async (request) => {
  const denied = requireDebugAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');
  const category =
    categoryParam && VALID_CATEGORIES.has(categoryParam as DebugLogCategory)
      ? (categoryParam as DebugLogCategory)
      : undefined;

  return NextResponse.json({
    logs: getDebugLogs(category),
    count: getDebugLogs(category).length,
  });
  },
);
