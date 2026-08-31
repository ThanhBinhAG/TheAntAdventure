import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  hotelCreateRequestSchema,
  hotelSchema,
  hotelUpdateRequestSchema,
} from '@/lib/suppliers/hotel-input';
import {
  cruiseCreateRequestSchema,
  restaurantCreateRequestSchema,
  transportCreateRequestSchema,
} from '@/lib/suppliers/quicklist-input';
import {
  extendedSupplierCreateRequestSchema,
  extendedSupplierSchema,
} from '@/lib/suppliers/extended-supplier-input';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Suppliers page uses CRM BFF instead of Zustand auto-sync writes', () => {
  const page = source('components/pages/Suppliers.tsx');
  const hotelTab = source('components/suppliers/HotelTab.tsx');
  const quickTab = source('components/suppliers/QuickListTab.tsx');
  const extTab = source('components/suppliers/ExtendedSupplierTab.tsx');
  const listHook = source('hooks/useSuppliersPage.ts');
  const hotelHook = source('hooks/useHotelMutations.ts');
  const quickHook = source('hooks/useQuickListMutations.ts');
  const extHook = source('hooks/useExtendedSupplierMutations.ts');

  assert.match(page, /useSuppliersPage/);
  assert.match(hotelTab, /useHotelMutations/);
  assert.match(quickTab, /useQuickListMutations/);
  assert.match(extTab, /useExtendedSupplierMutations/);
  assert.doesNotMatch(hotelTab, /\baddHotel\s*=\s*useStore/);
  assert.doesNotMatch(quickTab, /\baddTransport\s*=\s*useStore/);
  assert.doesNotMatch(extTab, /\baddSpecialSupplier\s*=\s*useStore/);

  assert.match(listHook, /getBffArray/);
  assert.match(listHook, /\/api\/hotels/);
  assert.match(listHook, /\/api\/transport/);
  assert.match(listHook, /\/api\/restaurants/);
  assert.match(listHook, /\/api\/cruises/);
  assert.match(listHook, /\/api\/suppliers/);
  assert.match(listHook, /withoutAutoSyncAsync/);
  assert.match(hotelHook, /fetch\('\/api\/hotels'/);
  assert.match(hotelHook, /previous/);
  assert.match(hotelHook, /DELETE/);
  assert.match(quickHook, /withoutAutoSyncAsync/);
  assert.match(extHook, /\/api\/suppliers/);
});

test('Suppliers BFF contracts validate create/update payloads', () => {
  const badHotel = hotelSchema.safeParse({ name: '', region: 'north' });
  assert.equal(badHotel.success, false);

  const hotel = hotelCreateRequestSchema.safeParse({
    hotel: {
      name: 'Sofitel Legend',
      dest: 'Hanoi',
      cat: 'Palace',
      stars: '5★',
      region: 'north',
      rooms: [{ type: 'Luxury Suite', lm: 280, hm: 320, fm: 400, pm: 450, ln: 180, hn: 200, fn: 250, pn: 280 }],
    },
  });
  assert.equal(hotel.success, true);

  const update = hotelUpdateRequestSchema.safeParse({
    hotel: {
      id: 'HTL-001',
      name: 'Sofitel Legend',
      dest: 'Hanoi',
      cat: 'Palace',
      stars: '5★',
      region: 'north',
      rooms: [],
    },
  });
  assert.equal(update.success, true);

  assert.equal(
    transportCreateRequestSchema.safeParse({
      transport: { name: 'Luxury Transfer' },
    }).success,
    true,
  );
  assert.equal(
    restaurantCreateRequestSchema.safeParse({
      restaurant: { name: 'Home Hanoi', cap: 40 },
    }).success,
    true,
  );
  assert.equal(
    cruiseCreateRequestSchema.safeParse({
      cruise: { name: 'Heritage Line' },
    }).success,
    true,
  );

  const badExt = extendedSupplierSchema.safeParse({ cat: 'visa', name: '' });
  assert.equal(badExt.success, false);
  assert.equal(
    extendedSupplierCreateRequestSchema.safeParse({
      supplier: { cat: 'visa', name: 'Visa Pro', tags: ['Preferred'] },
    }).success,
    true,
  );

  assert.equal(nextSupplierId('HTL-', [{ id: 'HTL-001' }, { id: 'HTL-002' }]), 'HTL-003');
});

test('Suppliers API routes enforce suppliers.read / suppliers.write', () => {
  const routes = [
    'app/api/hotels/route.ts',
    'app/api/hotels/[id]/route.ts',
    'app/api/transport/route.ts',
    'app/api/transport/[id]/route.ts',
    'app/api/restaurants/route.ts',
    'app/api/restaurants/[id]/route.ts',
    'app/api/cruises/route.ts',
    'app/api/cruises/[id]/route.ts',
    'app/api/suppliers/route.ts',
    'app/api/suppliers/[id]/route.ts',
  ];
  for (const path of routes) {
    const src = source(path);
    assert.match(src, /requiredPermission: 'suppliers\.(read|write)'/);
  }
  assert.match(source('app/api/hotels/route.ts'), /requiredPermission: 'suppliers\.read'/);
  assert.match(source('app/api/hotels/route.ts'), /requiredPermission: 'suppliers\.write'/);
  assert.match(source('app/api/hotels/[id]/route.ts'), /deleteHotelServer/);
  assert.match(source('lib/suppliers/hotel-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/suppliers/quicklist-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/suppliers/extended-supplier-repository.ts'), /import 'server-only'/);
});

test('Suppliers tables are BFF-managed', () => {
  for (const table of ['hotels', 'transport', 'restaurants', 'cruises', 'suppliers'] as const) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true);
  }
});
