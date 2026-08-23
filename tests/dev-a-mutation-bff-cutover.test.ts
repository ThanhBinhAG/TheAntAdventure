import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev A mutations stay BFF-managed and never enter browser auto-sync', () => {
  const bffManaged = source('lib/db/bff-managed-tables.ts');
  const autoSync = source('lib/db/auto-sync.ts');
  const syncPush = source('lib/db/sync-push.ts');
  const store = source('lib/store.ts');
  const tourDesign = source('components/tour-design/TourDesignPage.tsx');

  for (const table of ['products', 'product_pricing', 'tasks', 'attractions', 'tour_drafts', 'tour_outline_days']) {
    assert.match(bffManaged, new RegExp(`'${table}'`));
  }
  assert.match(autoSync, /filterBffManagedTables/);
  assert.match(syncPush, /filterBffManagedTables/);
  assert.doesNotMatch(store, /deleteProductFromRemote|deleteProductPricingFromRemote/);

  const persistStart = tourDesign.indexOf('const persistDraft = useCallback');
  const persistEnd = tourDesign.indexOf('const persistTourDesignAck', persistStart);
  const persistDraft = tourDesign.slice(persistStart, persistEnd);
  assert.match(persistDraft, /await fetch\('\/api\/tour-design\/save'/);
  assert.ok(persistDraft.indexOf('upsertTourDraft(draft)') > persistDraft.indexOf('await fetch'));
  assert.ok(persistDraft.indexOf('replaceOutlineDaysForDraft') > persistDraft.indexOf('await fetch'));
});
