import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Dev A mutations stay BFF-managed without browser auto-sync stack', () => {
  const bffManaged = source('lib/db/bff-managed-tables.ts');
  const store = source('lib/store.ts');
  const tourDesign = source('components/tour-design/TourDesignPage.tsx');

  assert.equal(existsSync(join(process.cwd(), 'lib/db/auto-sync.ts')), false);
  assert.equal(existsSync(join(process.cwd(), 'lib/db/sync-push.ts')), false);
  assert.match(source('lib/db/sync-guard.ts'), /withoutAutoSyncAsync/);

  for (const table of ['customers', 'agents', 'products', 'product_pricing', 'tasks', 'attractions', 'tour_drafts', 'tour_outline_days']) {
    assert.match(bffManaged, new RegExp(`'${table}'`));
  }
  assert.doesNotMatch(store, /deleteProductFromRemote|deleteProductPricingFromRemote/);

  const persistStart = tourDesign.indexOf('const persistDraft = useCallback');
  const persistEnd = tourDesign.indexOf('const persistTourDesignAck', persistStart);
  const persistDraft = tourDesign.slice(persistStart, persistEnd);
  assert.match(persistDraft, /await fetch\('\/api\/tour-design\/save'/);
  assert.match(persistDraft, /onLatestSuccess/);
  assert.ok(persistDraft.indexOf('upsertTourDraft({ ...draft, saveRevision })') > persistDraft.indexOf('await fetch'));
  assert.ok(persistDraft.indexOf('replaceOutlineDaysForDraft') > persistDraft.indexOf('await fetch'));

  const workflowStart = tourDesign.indexOf('async function runOutlineWorkflow');
  const workflowEnd = tourDesign.indexOf('function aiSuggestStyle', workflowStart);
  const workflow = tourDesign.slice(workflowStart, workflowEnd);
  assert.match(workflow, /fetch\('\/api\/tour-design\/outline-workflow'/);
  assert.doesNotMatch(workflow, /persistDraft\(/);
  assert.doesNotMatch(workflow, /patchOutline(?:Sent|Resent|Approved|Revise)/);
  assert.ok(workflow.indexOf('updateLead(result.lead.id') > workflow.indexOf('const result = body.data'));
  assert.ok(workflow.indexOf('addComm(result.comm)') > workflow.indexOf('const result = body.data'));
});
