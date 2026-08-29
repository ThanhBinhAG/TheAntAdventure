import { NextResponse } from 'next/server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

/**
 * @deprecated Use GET /api/weather/destination?id=… (lazy per-destination).
 * Kept so old clients get a clear migration error instead of silent breakage.
 */
export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'weather/weekly', route: '/api/weather/weekly' },
  async (_request, _context, { logger }) => {
  logger.warn({ event: 'weather.weekly.deprecated', statusCode: 410 }, 'Deprecated weather weekly endpoint called');
  return NextResponse.json(
    {
      error:
        'Deprecated. Use GET /api/weather/destination?id=<destinationId> and GET /api/weather/destinations.',
      deprecated: true,
    },
    { status: 410 }
  );
  },
);
