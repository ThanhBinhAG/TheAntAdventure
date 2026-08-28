import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { bookingCreateRequestSchema } from '@/lib/bookings/booking-input';
import {
  BookingRepositoryError,
  createBookingServer,
  listBookingsServer,
} from '@/lib/bookings/booking-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'bookings', route: '/api/bookings' },
    requiredPermission: 'bookings.read',
  },
  async ({ supabase }) => listBookingsServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'bookings', route: '/api/bookings' },
    requiredPermission: 'bookings.write',
    bodySchema: bookingCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createBookingServer(supabase, body.booking);
    } catch (error) {
      if (error instanceof BookingRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
