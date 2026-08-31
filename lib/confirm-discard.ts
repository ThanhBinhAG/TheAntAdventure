import { confirmDialog } from '@/lib/confirm';
import { tc } from '@/lib/i18n/common';
import type { AppLanguage } from '@/lib/i18n/stages';

/**
 * Confirm discarding unsaved form changes. Resolves true when the user chooses to leave.
 */
export async function confirmDiscardChanges(language: AppLanguage): Promise<boolean> {
  return confirmDialog(tc('unsavedChangesMessage', language), {
    title: tc('unsavedChangesTitle', language),
    confirmLabel: tc('unsavedChangesLeave', language),
    cancelLabel: tc('unsavedChangesStay', language),
    danger: false,
  });
}
