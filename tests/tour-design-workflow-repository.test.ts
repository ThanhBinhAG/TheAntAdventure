import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const input = {
  action: 'sent' as const,
  draft: { id: 'TD-001', leadId: 'LD-001', custId: 'C-001', outlineStatus: 'draft' as const },
  outlineDays: [],
  expectedSaveRevision: 4,
};

test('Tour Design workflow repository maps the single transactional RPC result', async () => {
  const { applyTourDesignOutlineWorkflowServer } = await import('../lib/tour-design/tour-design-repository');
  let rpcName = '';
  let rpcArgs: unknown;
  const result = await applyTourDesignOutlineWorkflowServer({
    rpc: async (name: string, args: unknown) => {
      rpcName = name;
      rpcArgs = args;
      return {
        data: {
          draft: {
            id: 'TD-001', lead_id: 'LD-001', cust_id: 'C-001', outline_status: 'sent', save_revision: 5,
          },
          lead: {
            id: 'LD-001', cust_id: 'C-001', tour: 'Vietnam', pax: 2, value: 0, month: 'Oct',
            stage: 'Pending', owner: 'Tai', probability: 70,
          },
          comm: {
            id: 'CM-001', cust_id: 'C-001', comm_date: '2026-08-24', type: 'Note', direction: 'outbound',
            subject: 'Outline sent', body: 'Sent', author: 'Tai (The Ant Adventures)',
          },
        },
        error: null,
      };
    },
  } as never, input);

  assert.equal(rpcName, 'apply_tour_design_outline_workflow');
  assert.deepEqual(rpcArgs, {
    p_action: 'sent',
    p_draft: expectDraftRow(),
    p_outline_days: [],
    p_expected_save_revision: 4,
  });
  assert.equal(result.draft.saveRevision, 5);
  assert.equal(result.lead.nextAction, undefined);
  assert.deepEqual(result.comm, {
    id: 'CM-001', cid: 'C-001', date: '2026-08-24', type: 'Note', dir: 'outbound',
    subj: 'Outline sent', body: 'Sent', author: 'Tai (The Ant Adventures)',
  });
});

test('Tour Design workflow repository preserves stale-revision conflicts', async () => {
  const { applyTourDesignOutlineWorkflowServer, TourDesignSaveConflictError } = await import('../lib/tour-design/tour-design-repository');
  await assert.rejects(
    () => applyTourDesignOutlineWorkflowServer({
      rpc: async () => ({ data: null, error: { code: 'P0001', details: 'current_save_revision=7' } }),
    } as never, input),
    (error: unknown) => error instanceof TourDesignSaveConflictError && error.currentSaveRevision === 7,
  );
});

function expectDraftRow() {
  return {
    id: 'TD-001', lead_id: 'LD-001', cust_id: 'C-001', brief_json: null,
    outline_status: 'draft', outline_notes: null, outline_sent_at: null, outline_approved_at: null,
    outline_revision: 0, save_revision: 0, selected_codes: null, selected_package_id: null,
    markup_pct: 30, client_type: 'b2c', current_step: 0,
  };
}
