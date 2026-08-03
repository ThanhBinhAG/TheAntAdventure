import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  getHydrationState,
  isManualPushAllowed,
  isSyncAllowed,
  markHydrationFailed,
  markHydrationPending,
  markHydrationReady,
} from '../lib/db/sync-lifecycle';
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
