import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pickRouteSnapshot,
  resolveRouteCacheTables,
  ROUTE_CACHE_DENYLIST,
  ROUTE_CACHE_MAX_BYTES,
  ROUTE_CACHE_TTL_MS,
  ROUTE_REVALIDATE_MIN_AGE_MS,
  shouldRevalidateCache,
  tablesEligibleForRouteCache,
} from '../lib/db/route-cache';
import { bootTablesForPage, TABLE_TO_STORE_KEY } from '../lib/db/sync-config';
import type { BackupData } from '../lib/types';

describe('route cache helpers', () => {
  it('exposes a 5-minute TTL, 60s revalidate minimum, and ~1.5MB size gate', () => {
    assert.equal(ROUTE_CACHE_TTL_MS, 5 * 60 * 1000);
    assert.equal(ROUTE_REVALIDATE_MIN_AGE_MS, 60 * 1000);
    assert.equal(ROUTE_CACHE_MAX_BYTES, 1_500_000);
  });

  it('shouldRevalidateCache respects minimum age', () => {
    const now = Date.now();
    assert.equal(shouldRevalidateCache(now - 30_000), false);
    assert.equal(shouldRevalidateCache(now - 90_000), true);
  });

  it('denylists photos and photo_folders from sessionStorage eligibility', () => {
    assert.ok(ROUTE_CACHE_DENYLIST.includes('photos'));
    assert.ok(ROUTE_CACHE_DENYLIST.includes('photo_folders'));
    const eligible = tablesEligibleForRouteCache([
      'customers',
      'photos',
      'photo_folders',
      'leads',
    ]);
    assert.deepEqual(eligible, ['customers', 'leads']);
  });

  it('resolveRouteCacheTables uses boot ∩ hydrated and drops denylist', () => {
    const hydrated = [
      'products',
      'customers',
      'leads',
      'tour_drafts',
      'tour_outline_days',
      'hotels',
      'photos',
      'photo_folders',
      'comms',
      'bookings',
    ] as const;
    const tables = resolveRouteCacheTables('tourdesign', hydrated);
    assert.ok(!tables.includes('photos'));
    assert.ok(!tables.includes('photo_folders'));
    assert.ok(!tables.includes('bookings')); // not in tourdesign boot
    assert.ok(tables.includes('products'));
    assert.ok(tables.includes('customers'));
    assert.deepEqual(resolveRouteCacheTables(undefined, hydrated), []);
  });

  it('pickRouteSnapshot only keeps requested table keys and never messages', () => {
    const backup = {
      customers: [{ id: 'c1' }],
      leads: [],
      bookings: [],
      agents: [],
      feedback: [],
      tasks: [],
      tourDrafts: [],
      products: [{ code: 'P1' }],
      photos: [{ id: 'ph1' }],
      messages: { general: [{ id: 'm1' }] },
      exportedAt: '',
      version: '5.0',
    } as unknown as BackupData;

    const bootTables = bootTablesForPage('customers');
    const partial = pickRouteSnapshot(backup, bootTables, false);
    for (const table of bootTables) {
      const key = TABLE_TO_STORE_KEY[table];
      assert.ok(Object.prototype.hasOwnProperty.call(partial, key), `missing ${key}`);
    }
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'products'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'photos'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'messages'), false);

    const withMsgFlag = pickRouteSnapshot(backup, bootTables, true);
    assert.equal(Object.prototype.hasOwnProperty.call(withMsgFlag, 'messages'), false);

    const galleryEligible = pickRouteSnapshot(
      backup,
      bootTablesForPage('gallery'),
      false
    );
    assert.equal(Object.keys(galleryEligible).length, 0);
  });
});
