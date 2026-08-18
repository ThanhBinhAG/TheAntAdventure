import type { Lead, TourDraft } from '../types';

export function getTourDraftForLead(leadId: string, tourDrafts: TourDraft[]): TourDraft | undefined {
  return tourDrafts.find((d) => d.leadId === leadId);
}

/** Sales Pipeline handoff still waiting for Client Brief progress (Next → Outline). */
export function isPendingTourDesignLead(lead: Lead): boolean {
  return Boolean(
    lead.needsTourDesign &&
      !lead.tourDesignAcked &&
      lead.stage !== 'Lost' &&
      lead.stage !== 'Completed'
  );
}

export function ackTourDesignLead(lead: Lead): Lead {
  return { ...lead, tourDesignAcked: true };
}

export function ackTourDesignLeadInList(leads: Lead[], leadId: string): Lead[] {
  return leads.map((l) => (l.id === leadId ? ackTourDesignLead(l) : l));
}

export function countPendingTourDesignLeads(leads: Lead[]): number {
  return leads.filter(isPendingTourDesignLead).length;
}

export function getPendingTourDesignLeads(leads: Lead[]): Lead[] {
  return leads.filter(isPendingTourDesignLead);
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
