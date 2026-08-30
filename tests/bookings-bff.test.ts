import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { nextBookingId } from '@/lib/bookings/booking-ids';
import {
  bookingCreateRequestSchema,
  bookingSchema,
  bookingUpdateRequestSchema,
} from '@/lib/bookings/booking-input';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { ROUTE_CACHE_DENYLIST } from '@/lib/db/route-cache';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Bookings page uses CRM BFF instead of Zustand auto-sync writes', () => {
  const page = source('components/bookings/BookingsPage.tsx');
  const formModal = source('components/bookings/BookingFormModal.tsx');
  const listHook = source('hooks/useBookingsPage.ts');
  const createHook = source('hooks/useCreateBooking.ts');
  const updateHook = source('hooks/useUpdateBooking.ts');

  assert.match(page, /useBookingsPage/);
  assert.match(page, /useCreateBooking/);
  assert.match(page, /useUpdateBooking/);
  assert.match(page, /useEnsureCustomersCatalogLoaded/);
  assert.match(page, /BookingFormModal/);
  assert.match(formModal, /nc-form-error/);
  assert.match(formModal, /validateBookingForm/);
  assert.doesNotMatch(page, /\baddBooking\s*=\s*useStore/);
  assert.doesNotMatch(page, /\bupdateBooking\s*=\s*useStore/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(listHook, /fetchBookingsCatalogOnce/);
  assert.match(source('lib/bookings/booking-catalog-fetch.ts'), /\/api\/bookings/);
  assert.match(listHook, /withoutAutoSyncAsync/);
  assert.match(createHook, /fetch\('\/api\/bookings'/);
  assert.match(createHook, /withoutAutoSyncAsync/);
  assert.match(updateHook, /\/api\/bookings\//);
  assert.match(updateHook, /withoutAutoSyncAsync/);
  assert.match(updateHook, /previous/);
});

test('Bookings BFF contracts validate create/update payloads', () => {
  const bad = bookingSchema.safeParse({ custId: '', tour: 'Tour' });
  assert.equal(bad.success, false);

  const badDate = bookingSchema.safeParse({
    custId: 'C-001',
    tour: 'North Classic',
    start: 'TBD',
  });
  assert.equal(badDate.success, false);

  const badRange = bookingSchema.safeParse({
    custId: 'C-001',
    tour: 'North Classic',
    start: '2026-10-20',
    end: '2026-10-12',
  });
  assert.equal(badRange.success, false);

  const create = bookingCreateRequestSchema.safeParse({
    booking: {
      custId: 'C-001',
      tour: 'North Classic',
      pax: 2,
      status: 'Confirmed',
      total: 1000,
      deposit: 300,
    },
  });
  assert.equal(create.success, true);
  if (create.success) {
    assert.equal(create.data.booking.guide, '');
    assert.equal(create.data.booking.changes.length, 0);
    assert.equal(create.data.booking.guideAlertPending, false);
  }

  const update = bookingUpdateRequestSchema.safeParse({
    booking: {
      id: 'BK-2026-001',
      custId: 'C-001',
      tour: 'North Classic',
      pax: 3,
      status: 'On Tour',
      total: 1200,
      deposit: 300,
      changes: [
        {
          id: 'CHG-1',
          type: 'add',
          date: '2026-08-27',
          description: 'Added: Cooking class',
          costImpact: 150,
        },
      ],
      guideAlertPending: true,
    },
  });
  assert.equal(update.success, true);

  assert.equal(nextBookingId([{ id: 'BK-2026-001' }, { id: 'BK-2026-002' }], 2026), 'BK-2026-003');
});

test('Bookings API routes enforce bookings.read / bookings.write', () => {
  const listRoute = source('app/api/bookings/route.ts');
  const idRoute = source('app/api/bookings/[id]/route.ts');
  assert.match(listRoute, /requiredPermission: 'bookings\.read'/);
  assert.match(listRoute, /requiredPermission: 'bookings\.write'/);
  assert.match(idRoute, /requiredPermission: 'bookings\.read'/);
  assert.match(idRoute, /requiredPermission: 'bookings\.write'/);
  assert.match(listRoute, /createBookingServer/);
  assert.match(idRoute, /updateBookingServer/);
  assert.match(source('lib/bookings/booking-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/sales/lead-repository.ts'), /insertBookingServer/);
});

test('Bookings hydrate cutover: empty boot, denylist, no shell hydrate', () => {
  assert.equal((PAGE_BOOT_TABLES.bookings ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('bookings'), true);
  assert.equal((SHELL_HYDRATE_TABLES as readonly string[]).includes('bookings'), false);
  assert.equal((ROUTE_CACHE_DENYLIST as readonly string[]).includes('bookings'), true);
});
