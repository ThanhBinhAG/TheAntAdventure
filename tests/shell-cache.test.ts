import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pickShellSnapshot,
  SHELL_CACHE_TTL_MS,
} from '../lib/db/shell-cache';
import { SHELL_HYDRATE_TABLES, TABLE_TO_STORE_KEY } from '../lib/db/sync-config';
import type { BackupData } from '../lib/types';

describe('shell cache helpers', () => {
  it('exposes a 5-minute TTL', () => {
    assert.equal(SHELL_CACHE_TTL_MS, 5 * 60 * 1000);
  });

  it('pickShellSnapshot only keeps shell keys', () => {
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

    const partial = pickShellSnapshot(backup, false);
    for (const table of SHELL_HYDRATE_TABLES) {
      const key = TABLE_TO_STORE_KEY[table];
      assert.ok(Object.prototype.hasOwnProperty.call(partial, key), `missing ${key}`);
    }
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'products'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'photos'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(partial, 'messages'), false);

    const withMsg = pickShellSnapshot(backup, true);
    assert.ok(withMsg.messages);
  });
});
