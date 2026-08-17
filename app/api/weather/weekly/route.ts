import { NextResponse } from 'next/server';

/**
 * @deprecated Use GET /api/weather/destination?id=… (lazy per-destination).
 * Kept so old clients get a clear migration error instead of silent breakage.
 */
export async function GET() {
  return NextResponse.json(
    {
      error:
        'Deprecated. Use GET /api/weather/destination?id=<destinationId> and GET /api/weather/destinations.',
      deprecated: true,
    },
    { status: 410 }
  );
}
