import { localTodayIso } from '../core/date-utils';
import { formatLeadTravelMonth } from '../sales/sales-lead-utils';
import type { TourBrief } from '../tour-design/tour-design-types';
import { nextLeadId } from '../customers/customer-onboarding';
import type { Comm, Customer, Lead, TourDraft } from '../types';

export function buildOutlineComm(
  custId: string,
  subject: string,
  body: string,
  author: string
): Comm {
  return {
    id: `CM-${Date.now()}`,
    cid: custId,
    date: localTodayIso(),
    type: 'Note',
    dir: 'outbound',
    subj: subject,
    body,
    author,
  };
}

export type OutlineWorkflowPatch = {
  draft: Partial<TourDraft>;
  lead: Partial<Lead>;
  comm?: Comm;
};

function commAuthor(salesperson?: string): string {
  return salesperson?.trim() ? `${salesperson} (The Ant Adventures)` : 'The Ant Adventures';
}

/** First send from draft (never sent before). */
export function patchOutlineSent(
  draft: TourDraft,
  custId: string,
  custName: string,
  salesperson?: string
): OutlineWorkflowPatch {
  const now = new Date().toISOString();
  const revision = 1;

  return {
    draft: {
      outlineStatus: 'sent',
      outlineSentAt: now,
      outlineRevision: revision,
    },
    lead: {
      stage: 'Pending',
      probability: 70,
      nextAction: 'Awaiting client outline approval',
    },
    comm: buildOutlineComm(
      custId,
      `Outline sent to ${custName}`,
      `Day-by-day outline (revision ${revision}) sent to ${custName} for client review.`,
      commAuthor(salesperson)
    ),
  };
}

/** Resend after revise (draft with prior revision). */
export function patchOutlineResent(
  draft: TourDraft,
  custId: string,
  custName: string,
  salesperson?: string
): OutlineWorkflowPatch {
  const now = new Date().toISOString();
  const nextRev = (draft.outlineRevision ?? 0) + 1;
  return {
    draft: {
      outlineStatus: 'sent',
      outlineSentAt: now,
      outlineRevision: nextRev,
    },
    lead: {
      stage: 'Pending',
      probability: 70,
      nextAction: `Outline revision ${nextRev} sent — awaiting client approval`,
    },
    comm: buildOutlineComm(
      custId,
      `Outline revision ${nextRev} sent`,
      `Revised outline (revision ${nextRev}) sent to ${custName} for review.`,
      commAuthor(salesperson)
    ),
  };
}

export function patchOutlineApproved(
  draft: TourDraft,
  custId: string,
  custName: string,
  salesperson?: string
): OutlineWorkflowPatch {
  const now = new Date().toISOString();
  return {
    draft: {
      outlineStatus: 'approved',
      outlineApprovedAt: now,
    },
    lead: {
      stage: 'Designing',
      probability: 25,
      nextAction: 'Build tour experiences from approved outline',
    },
    comm: buildOutlineComm(
      custId,
      `Outline approved — ${custName}`,
      `Client approved the day-by-day outline. Proceed to tour experiences and pricing.`,
      commAuthor(salesperson)
    ),
  };
}

/** Unlock editor for changes after client feedback. */
export function patchOutlineRevise(draft: TourDraft): OutlineWorkflowPatch {
  return {
    draft: {
      outlineStatus: 'draft',
      outlineApprovedAt: undefined,
    },
    lead: {
      nextAction: `Revise outline (revision ${draft.outlineRevision ?? 1}) — resend when ready`,
    },
  };
}

export function outlineStatusLabel(status: string): string {
  if (status === 'sent') return 'Sent';
  if (status === 'approved') return 'Approved';
  return 'Draft';
}

export function formatOutlineTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ensureTourDesignLead(input: {
  custId: string;
  customer: Customer;
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  leads: Lead[];
}): Lead {
  const { custId, customer, brief, clientType, leads } = input;
  const existing = leads.find(
    (l) =>
      l.custId === custId &&
      l.stage !== 'Lost' &&
      l.stage !== 'Completed' &&
      (l.stage === 'Designing' || l.stage === 'Pending' || l.stage === 'Inquiry' || l.needsTourDesign)
  );
  if (existing) return existing;

  const id = nextLeadId(leads);
  const tour = `${brief.duration || 'Tour'} — ${brief.region || 'Vietnam'} outline`;
  return {
    id,
    custId,
    tour,
    pax: brief.pax,
    value: 0,
    month: formatLeadTravelMonth(brief.travelMonth, brief.startDate),
    stage: 'Designing',
    owner: brief.salesperson?.split(' ')[0] || 'Tai',
    nextAction: 'Outline — build day plan',
    probability: 25,
    clientType,
    agentId: customer.agentId,
    needsTourDesign: true,
    tourDesignAcked: true,
    notes: 'Auto-created from Tour Design',
  };
}
