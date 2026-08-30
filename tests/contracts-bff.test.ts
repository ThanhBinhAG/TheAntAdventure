import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { nextContractId } from '@/lib/contracts/contract-ids';
import {
  contractCreateRequestSchema,
  contractSchema,
  contractUpdateRequestSchema,
} from '@/lib/contracts/contract-input';
import {
  buildContractFormFromBooking,
  computeTourDurationLabel,
  depositPctFromBooking,
  filterClientNameSuggestions,
} from '@/lib/contracts/contract-booking-fill';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { ROUTE_CACHE_DENYLIST } from '@/lib/db/route-cache';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Contracts page uses CRM BFF instead of Zustand auto-sync writes', () => {
  const page = source('components/contracts/ContractsPage.tsx');
  const listHook = source('hooks/useContractsPage.ts');
  const createHook = source('hooks/useCreateContract.ts');
  const updateHook = source('hooks/useUpdateContract.ts');
  const deleteHook = source('hooks/useDeleteContract.ts');

  assert.match(page, /useContractsPage/);
  assert.match(page, /useCreateContract/);
  assert.match(page, /useUpdateContract/);
  assert.match(page, /useDeleteContract/);
  assert.match(page, /useEnsureBookingsCatalogLoaded/);
  assert.match(page, /useEnsureCustomersCatalogLoaded/);
  assert.match(source('hooks/useEnsureBookingsCatalogLoaded.ts'), /fetchBookingsCatalogOnce/);
  assert.match(source('hooks/useEnsureBookingsCatalogLoaded.ts'), /isBookingsCatalogLoaded/);
  assert.match(source('components/contracts/ContractFormModal.tsx'), /buildContractFormFromBooking/);
  assert.match(source('components/contracts/ContractFormModal.tsx'), /ContractClientNameCombobox/);
  assert.doesNotMatch(page, /\baddContract\s*=\s*useStore/);
  assert.doesNotMatch(page, /\bupdateContract\s*=\s*useStore/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(listHook, /getBffArray/);
  assert.match(listHook, /\/api\/contracts/);
  assert.match(listHook, /withoutAutoSyncAsync/);
  assert.match(createHook, /fetch\('\/api\/contracts'/);
  assert.match(createHook, /withoutAutoSyncAsync/);
  assert.match(updateHook, /\/api\/contracts\//);
  assert.match(updateHook, /withoutAutoSyncAsync/);
  assert.match(updateHook, /previous/);
  assert.match(deleteHook, /method: 'DELETE'/);
  assert.match(deleteHook, /\/api\/contracts\//);
  assert.match(deleteHook, /withoutAutoSyncAsync/);
});

test('Contracts BFF contracts validate create/update payloads', () => {
  const bad = contractSchema.safeParse({ clientName: '', tourName: 'Tour' });
  assert.equal(bad.success, false);

  const create = contractCreateRequestSchema.safeParse({
    contract: {
      clientName: 'Co Thu',
      tourName: 'North Classic',
      pax: 2,
      total: 1000,
      depositPct: 50,
    },
  });
  assert.equal(create.success, true);
  if (create.success) {
    assert.equal(create.data.contract.status, 'Draft');
    assert.equal(create.data.contract.currency, 'USD');
    assert.equal(create.data.contract.bookingId, '');
  }

  const update = contractUpdateRequestSchema.safeParse({
    contract: {
      id: 'CTR-2026-001',
      clientName: 'Co Thu',
      tourName: 'North Classic',
      pax: 4,
      status: 'Signed',
      total: 1200,
      depositPct: 50,
      signedAt: '2026-08-27',
    },
  });
  assert.equal(update.success, true);

  assert.equal(
    nextContractId([{ id: 'CTR-2026-001' }, { id: 'CTR-2026-002' }], 2026),
    'CTR-2026-003',
  );
});

test('Contracts API routes enforce contracts.read / contracts.write', () => {
  const listRoute = source('app/api/contracts/route.ts');
  const idRoute = source('app/api/contracts/[id]/route.ts');
  assert.match(listRoute, /requiredPermission: 'contracts\.read'/);
  assert.match(listRoute, /requiredPermission: 'contracts\.write'/);
  assert.match(idRoute, /requiredPermission: 'contracts\.read'/);
  assert.match(idRoute, /requiredPermission: 'contracts\.write'/);
  assert.match(listRoute, /createContractServer/);
  assert.match(idRoute, /updateContractServer/);
  assert.match(idRoute, /deleteContractServer/);
  assert.match(idRoute, /export async function DELETE/);
  assert.match(source('lib/contracts/contract-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/contracts/contract-repository.ts'), /deleteContractServer/);
});

test('Contracts hydrate cutover: empty boot, denylist, no shell hydrate', () => {
  assert.equal((PAGE_BOOT_TABLES.contracts ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('contracts'), true);
  assert.equal((SHELL_HYDRATE_TABLES as readonly string[]).includes('contracts'), false);
  assert.equal((ROUTE_CACHE_DENYLIST as readonly string[]).includes('contracts'), true);
});

test('Contract booking fill maps booking + customer into form fields', () => {
  assert.equal(computeTourDurationLabel('2026-09-01', '2026-09-10'), '10 Days / 9 Nights');
  assert.equal(depositPctFromBooking(10_000, 5_000), 50);
  assert.equal(depositPctFromBooking(10_000, 3_100), 30);

  const patch = buildContractFormFromBooking(
    {
      id: 'BK-2026-001',
      custId: 'C-001',
      customerName: 'Roger Flint',
      tour: 'North Classic',
      pax: 2,
      start: '2026-09-01',
      end: '2026-09-10',
      total: 4000,
      deposit: 2000,
      status: 'Confirmed',
      guide: '—',
      hotel: '',
      changes: [],
      guideAlertPending: false,
      itinerary: [
        { day: 1, dest: 'Hanoi', hotel: '', activities: [] },
        { day: 2, dest: 'Halong', hotel: '', activities: [] },
      ],
    },
    { id: 'C-001', name: 'Roger Flint', nat: 'Australian' } as never,
  );

  assert.equal(patch.clientName, 'Roger Flint');
  assert.equal(patch.nationality, 'Australian');
  assert.equal(patch.tourName, 'North Classic');
  assert.equal(patch.duration, '10 Days / 9 Nights');
  assert.equal(patch.route, 'Hanoi – Halong');
  assert.equal(patch.rooms, '1 DBL');
  assert.equal(patch.depositPct, 50);

  const suggestions = filterClientNameSuggestions('rog', [], [
    {
      id: 'BK-2026-001',
      custId: 'C-001',
      customerName: 'Roger Flint',
      tour: 'North Classic',
      pax: 2,
      start: '',
      end: '',
      total: 0,
      deposit: 0,
      status: 'Confirmed',
      guide: '',
      hotel: '',
      changes: [],
      guideAlertPending: false,
    },
  ]);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.name, 'Roger Flint');
});
