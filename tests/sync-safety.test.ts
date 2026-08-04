import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  getHydratedTables,
  getHydrationState,
  isManualPushAllowed,
  isMessagesHydrated,
  isSyncAllowed,
  isTableHydrated,
  markHydrationFailed,
  markHydrationPending,
  markHydrationReady,
  markMessagesHydrated,
  markTablesHydrated,
} from '../lib/db/sync-lifecycle';
import {
  hydrateWavesCoverAllTables,
  PAGE_HYDRATE_TABLES,
  SHELL_HYDRATE_TABLES,
  SYNC_HYDRATE_WAVES,
  tablesForPage,
} from '../lib/db/sync-config';
import {
  buildOrphanSkipWarning,
  getTablePolicy,
  shouldSkipOrphanDelete,
} from '../lib/db/sync-policy';

describe('sync lifecycle', () => {
  const originalUseSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    if (originalUseSupabase === undefined) delete process.env.NEXT_PUBLIC_USE_SUPABASE;
    else process.env.NEXT_PUBLIC_USE_SUPABASE = originalUseSupabase;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    markHydrationPending();
    markHydrationReady({});
  });

  it('blocks sync while hydration is pending', () => {
    process.env.NEXT_PUBLIC_USE_SUPABASE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    markHydrationPending();
    assert.equal(getHydrationState().phase, 'pending');
    assert.equal(isSyncAllowed(), false);
    assert.equal(isManualPushAllowed(), false);
  });

  it('allows sync after hydration ready', () => {
    process.env.NEXT_PUBLIC_USE_SUPABASE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    markHydrationReady({ products: 196 });
    assert.equal(isSyncAllowed(), true);
    assert.equal(isManualPushAllowed(), true);
  });

  it('allows manual push when hydration failed', () => {
    process.env.NEXT_PUBLIC_USE_SUPABASE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    markHydrationFailed('timeout');
    assert.equal(isSyncAllowed(), false);
    assert.equal(isManualPushAllowed(), true);
  });

  it('tracks hydrated tables separately from phase', () => {
    markHydrationPending();
    assert.equal(isTableHydrated('customers'), false);
    assert.equal(isMessagesHydrated(), false);

    markTablesHydrated(['customers', 'leads']);
    markMessagesHydrated();
    markHydrationReady({ customers: 1, leads: 1 });

    assert.equal(isTableHydrated('customers'), true);
    assert.equal(isTableHydrated('photos'), false);
    assert.equal(isMessagesHydrated(), true);
    assert.deepEqual(getHydratedTables().sort(), ['customers', 'leads']);
  });

  it('clears hydrated tables on pending', () => {
    markTablesHydrated(['customers']);
    markMessagesHydrated();
    markHydrationPending();
    assert.equal(isTableHydrated('customers'), false);
    assert.equal(isMessagesHydrated(), false);
  });
});

describe('route boot tables', () => {
  it('partitions SYNC_ARRAY_TABLES exactly once across three waves', () => {
    assert.equal(SYNC_HYDRATE_WAVES.length, 3);
    assert.equal(hydrateWavesCoverAllTables(), true);
  });

  it('deprecated shell list still documents legacy 7-table set', () => {
    assert.equal(SHELL_HYDRATE_TABLES.length, 7);
    assert.equal(SHELL_HYDRATE_TABLES.includes('comms'), false);
  });

  it('customers boot is 3 tables without comms, bookings, or agents', () => {
    const boot = tablesForPage('customers');
    assert.deepEqual(boot.sort(), ['customers', 'feedback', 'leads']);
    assert.equal(boot.includes('comms'), false);
    assert.equal(boot.includes('bookings'), false);
    assert.equal(boot.includes('agents'), false);
  });

  it('dashboard boot includes bookings and agents; sales includes comms', () => {
    assert.ok(tablesForPage('dashboard').includes('bookings'));
    assert.ok(tablesForPage('dashboard').includes('agents'));
    assert.ok(tablesForPage('sales').includes('comms'));
  });

  it('gallery and finance declare expected boot tables', () => {
    assert.ok(tablesForPage('gallery').includes('photos'));
    assert.ok(tablesForPage('finance').includes('finance'));
    assert.ok(tablesForPage('tourdesign').includes('products'));
    assert.deepEqual(PAGE_HYDRATE_TABLES, {});
  });
});

describe('sync policy', () => {
  it('products use upsertOnly policy', () => {
    assert.equal(getTablePolicy('products'), 'upsertOnly');
    assert.equal(getTablePolicy('product_pricing'), 'upsertOnly');
    assert.equal(getTablePolicy('customers'), 'mirrorGuarded');
  });

  it('shouldSkipOrphanDelete for products always true without force', () => {
    markHydrationReady({ products: 196 });
    assert.equal(shouldSkipOrphanDelete('products', 3, false), true);
    assert.equal(shouldSkipOrphanDelete('products', 3, true), true);
  });

  it('shouldSkipOrphanDelete for mirror tables when local below baseline', () => {
    markHydrationReady({ customers: 100 });
    assert.equal(shouldSkipOrphanDelete('customers', 50, false), true);
    assert.equal(shouldSkipOrphanDelete('customers', 95, false), false);
    assert.equal(shouldSkipOrphanDelete('customers', 50, true), false);
  });

  it('shouldSkipOrphanDelete does not guard when baseline is zero', () => {
    markHydrationReady({ customers: 0 });
    assert.equal(shouldSkipOrphanDelete('customers', 0, false), false);
  });

  it('buildOrphanSkipWarning describes mismatch', () => {
    markHydrationReady({ products: 196 });
    const msg = buildOrphanSkipWarning('products', 3);
    assert.match(msg, /products: local=3, baseline=196/);
  });
});
