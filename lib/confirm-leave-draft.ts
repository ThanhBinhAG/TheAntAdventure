import { confirmChoice, type ConfirmChoice } from '@/lib/confirm';
import { tc } from '@/lib/i18n/common';
import type { AppLanguage } from '@/lib/i18n/stages';

export type LeaveWithDraftAction = 'stay' | 'discard' | 'saveDraft';

/** Maps confirmChoice result to leave-with-draft action. */
export function mapLeaveWithDraftChoice(choice: ConfirmChoice): LeaveWithDraftAction {
  if (choice === 'cancel') return 'stay';
  if (choice === 'tertiary') return 'discard';
  return 'saveDraft';
}

/**
 * Three-way leave prompt for forms that support local drafts.
 * Stay → cancel; Discard → tertiary; Save draft → confirm.
 */
export async function confirmLeaveWithDraft(
  language: AppLanguage,
): Promise<LeaveWithDraftAction> {
  const choice = await confirmChoice(tc('leaveWithDraftMessage', language), {
    title: tc('leaveWithDraftTitle', language),
    cancelLabel: tc('leaveWithDraftStay', language),
    tertiaryLabel: tc('leaveWithDraftDiscard', language),
    confirmLabel: tc('leaveWithDraftSave', language),
    danger: false,
    tertiaryDanger: true,
  });
  return mapLeaveWithDraftChoice(choice);
}
