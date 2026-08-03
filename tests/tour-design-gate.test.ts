import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isExperiencesBlocked } from '../lib/tour-design/tour-design-gate';
import {
  countPendingTourDesignLeads,
  countOutlineAwaitingApproval,
  countTourDesignAttention,
  getOutlineAwaitingApproval,
} from '../lib/tour-design/tour-design-leads';
import {
  applyOutlineWorkflowPatch,
  patchOutlineApproved,
  patchOutlineSent,
} from '../lib/tour-design/tour-outline-workflow';
import type { Lead, TourDraft } from '../lib/types';

const baseLead: Lead = {
  id: 'LD-100',
  custId: 'CUS-1',
  tour: 'Test',
  pax: 2,
  value: 0,
  month: 'Jun 2026',
  stage: 'Inquiry',
  owner: 'Tai',
};

const baseDraft: TourDraft = {
  id: 'TD-LD-100',
  leadId: 'LD-100',
  custId: 'CUS-1',
  outlineStatus: 'draft',
  outlineRevision: 0,
  currentStep: 1,
};

describe('tour design gate', () => {
  it('blocks experiences when lead has outline rows and status is not approved', () => {
    assert.equal(isExperiencesBlocked('LD-100', 3, 'draft'), true);
    assert.equal(isExperiencesBlocked('LD-100', 3, 'sent'), true);
    assert.equal(isExperiencesBlocked('LD-100', 3, 'approved'), false);
  });

  it('does not block without lead or empty outline', () => {
    assert.equal(isExperiencesBlocked(undefined, 3, 'draft'), false);
    assert.equal(isExperiencesBlocked('LD-100', 0, 'draft'), false);
    assert.equal(isExperiencesBlocked(undefined, 0, 'draft'), false);
  });
});

describe('pending tour design leads', () => {
  it('counts unacked sales pipeline leads only', () => {
    const leads: Lead[] = [
      { ...baseLead, id: 'LD-1', needsTourDesign: true, tourDesignAcked: false },
      { ...baseLead, id: 'LD-2', needsTourDesign: true, tourDesignAcked: true },
      { ...baseLead, id: 'LD-3', needsTourDesign: false },
      { ...baseLead, id: 'LD-4', needsTourDesign: true, tourDesignAcked: false, stage: 'Lost' },
    ];
    assert.equal(countPendingTourDesignLeads(leads), 1);
  });
});

describe('outline awaiting approval', () => {
  it('finds leads with sent outline drafts', () => {
    const leads: Lead[] = [
      { ...baseLead, id: 'LD-1' },
      { ...baseLead, id: 'LD-2' },
      { ...baseLead, id: 'LD-3', stage: 'Lost' },
    ];
    const drafts: TourDraft[] = [
      { ...baseDraft, leadId: 'LD-1', outlineStatus: 'sent' },
      { ...baseDraft, id: 'TD-LD-2', leadId: 'LD-2', outlineStatus: 'approved' },
      { ...baseDraft, id: 'TD-LD-3', leadId: 'LD-3', outlineStatus: 'sent' },
    ];
    const awaiting = getOutlineAwaitingApproval(leads, drafts);
    assert.equal(awaiting.length, 1);
    assert.equal(awaiting[0].id, 'LD-1');
    assert.equal(countOutlineAwaitingApproval(leads, drafts), 1);
  });

  it('combines pending handoffs and awaiting approval for sidebar badge', () => {
    const leads: Lead[] = [
      { ...baseLead, id: 'LD-1', needsTourDesign: true, tourDesignAcked: false },
      { ...baseLead, id: 'LD-2' },
    ];
    const drafts: TourDraft[] = [{ ...baseDraft, leadId: 'LD-2', outlineStatus: 'sent' }];
    assert.equal(countTourDesignAttention(leads, drafts), 2);
  });
});

describe('tour outline workflow', () => {
  it('applyOutlineWorkflowPatch merges draft and updates lead', () => {
    const draft = { ...baseDraft };
    const patch = patchOutlineSent(draft, 'CUS-1', 'Jane Doe', 'Tai');
    const holder: { draft: TourDraft | null; lead: Partial<Lead> | null } = {
      draft: null,
      lead: null,
    };

    const merged = applyOutlineWorkflowPatch('LD-100', draft, patch, {
      upsertTourDraft: (d) => {
        holder.draft = d;
      },
      updateLead: (_id, data) => {
        holder.lead = data;
      },
    });

    assert.equal(merged.outlineStatus, 'sent');
    assert.equal(holder.draft?.outlineStatus, 'sent');
    assert.equal(holder.lead?.stage, 'Pending');
  });

  it('patchOutlineApproved sets approved status and Designing stage', () => {
    const sentDraft = { ...baseDraft, outlineStatus: 'sent' as const, outlineRevision: 1 };
    const patch = patchOutlineApproved(sentDraft, 'CUS-1', 'Jane Doe');
    assert.equal(patch.draft.outlineStatus, 'approved');
    assert.ok(patch.draft.outlineApprovedAt);
    assert.equal(patch.lead.stage, 'Designing');
    assert.ok(patch.comm);
  });
});
