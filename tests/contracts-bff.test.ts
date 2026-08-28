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
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Contracts page uses CRM BFF instead of Zustand auto-sync writes', () => {
  const page = source('components/contracts/ContractsPage.tsx');
  const listHook = source('hooks/useContractsPage.ts');
  const createHook = source('hooks/useCreateContract.ts');
  const updateHook = source('hooks/useUpdateContract.ts');

  assert.match(page, /useContractsPage/);
  assert.match(page, /useCreateContract/);
  assert.match(page, /useUpdateContract/);
  assert.match(page, /useEnsureBookingsCatalogLoaded/);
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
  assert.match(source('lib/contracts/contract-repository.ts'), /import 'server-only'/);
});

test('Contracts hydrate cutover: empty boot, denylist, no shell hydrate', () => {
  assert.equal((PAGE_BOOT_TABLES.contracts ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('contracts'), true);
  assert.equal((SHELL_HYDRATE_TABLES as readonly string[]).includes('contracts'), false);
});
