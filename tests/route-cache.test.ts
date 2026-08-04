import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pickRouteSnapshot,
  ROUTE_CACHE_TTL_MS,
  ROUTE_REVALIDATE_MIN_AGE_MS,
  shouldRevalidateCache,
} from '../lib/db/route-cache';
import { bootTablesForPage, TABLE_TO_STORE_KEY } from '../lib/db/sync-config';
import type { BackupData } from '../lib/types';

describe('route cache helpers', () => {
  it('exposes a 5-minute TTL and 60s revalidate minimum', () => {
    assert.equal(ROUTE_CACHE_TTL_MS, 5 * 60 * 1000);
    assert.equal(ROUTE_REVALIDATE_MIN_AGE_MS, 60 * 1000);
  });

  it('shouldRevalidateCache respects minimum age', () => {
    const now = Date.now();
    assert.equal(shouldRevalidateCache(now - 30_000), false);
    assert.equal(shouldRevalidateCache(now - 90_000), true);
  });

  it('pickRouteSnapshot only keeps requested table keys', () => {
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

    const withMsg = pickRouteSnapshot(backup, bootTables, true);
    assert.ok(withMsg.messages);
  });
});
