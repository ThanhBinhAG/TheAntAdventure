import type { Comm, Lead, TourDraft } from '../types';
import type { OutlineWorkflowPatch } from './tour-design-lead';

export type OutlineWorkflowStoreActions = {
  upsertTourDraft: (draft: TourDraft) => void;
  updateLead: (leadId: string, data: Partial<Lead>) => void;
  addComm?: (comm: Comm) => void;
};

/** Merge workflow patch into draft and persist to store (shared by Tour Design + Sales). */
export function applyOutlineWorkflowPatch(
  leadId: string,
  draft: TourDraft,
  patch: OutlineWorkflowPatch,
  actions: OutlineWorkflowStoreActions,
  extraDraft?: Partial<TourDraft>
): TourDraft {
  const merged: TourDraft = { ...draft, ...patch.draft, ...extraDraft };
  actions.upsertTourDraft(merged);
  actions.updateLead(leadId, patch.lead);
  if (patch.comm && actions.addComm) actions.addComm(patch.comm);
  return merged;
}

export {
  patchOutlineSent,
  patchOutlineResent,
  patchOutlineApproved,
  patchOutlineRevise,
  buildOutlineComm,
  outlineStatusLabel,
  formatOutlineTimestamp,
} from './tour-design-lead';

export type { OutlineWorkflowPatch } from './tour-design-lead';
