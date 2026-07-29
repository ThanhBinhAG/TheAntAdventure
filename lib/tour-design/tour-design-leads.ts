import type { Lead, OutlineStatus, TourDraft } from '../types';

export function getTourDraftForLead(leadId: string, tourDrafts: TourDraft[]): TourDraft | undefined {
  return tourDrafts.find((d) => d.leadId === leadId);
}

export function countPendingTourDesignLeads(leads: Lead[]): number {
  return leads.filter(
    (l) =>
      l.needsTourDesign &&
      !l.tourDesignAcked &&
      l.stage !== 'Lost' &&
      l.stage !== 'Completed'
  ).length;
}

export function getPendingTourDesignLeads(leads: Lead[]): Lead[] {
  return leads.filter(
    (l) =>
      l.needsTourDesign &&
      !l.tourDesignAcked &&
      l.stage !== 'Lost' &&
      l.stage !== 'Completed'
  );
}

export function getOutlineAwaitingApproval(leads: Lead[], tourDrafts: TourDraft[]): Lead[] {
  const sentLeadIds = new Set(
    tourDrafts.filter((d) => d.outlineStatus === 'sent').map((d) => d.leadId)
  );
  return leads.filter(
    (l) => sentLeadIds.has(l.id) && l.stage !== 'Lost' && l.stage !== 'Completed'
  );
}

export function countOutlineAwaitingApproval(leads: Lead[], tourDrafts: TourDraft[]): number {
  return getOutlineAwaitingApproval(leads, tourDrafts).length;
}

/** Sidebar badge: new pipeline handoffs + outlines waiting on client. */
export function countTourDesignAttention(leads: Lead[], tourDrafts: TourDraft[]): number {
  return countPendingTourDesignLeads(leads) + countOutlineAwaitingApproval(leads, tourDrafts);
}

export function getOutlineStatusForLead(
  leadId: string,
  tourDrafts: TourDraft[]
): OutlineStatus | null {
  const draft = getTourDraftForLead(leadId, tourDrafts);
  return draft?.outlineStatus ?? null;
}
