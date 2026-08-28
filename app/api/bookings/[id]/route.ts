import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { bookingUpdateRequestSchema } from '@/lib/bookings/booking-input';
import {
  BookingRepositoryError,
  getBookingByIdServer,
  updateBookingServer,
} from '@/lib/bookings/booking-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'bookings', route: '/api/bookings/[id]' },
      requiredPermission: 'bookings.read',
    },
    async ({ supabase }) => {
      try {
        return await getBookingByIdServer(supabase, id);
      } catch (error) {
        if (error instanceof BookingRepositoryError && error.code === 'not_found') {
          return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
        }
        throw error;
      }
    },
  )(request);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'bookings', route: '/api/bookings/[id]' },
      requiredPermission: 'bookings.write',
      bodySchema: bookingUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      if (body.booking.id !== id) {
        return NextResponse.json(
          { ok: false, error: 'Booking id trong URL và body không khớp.' },
          { status: 400 },
        );
      }
      try {
        return await updateBookingServer(supabase, body.booking);
      } catch (error) {
        if (error instanceof BookingRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}
