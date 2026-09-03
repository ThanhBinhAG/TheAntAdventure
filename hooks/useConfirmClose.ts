'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { confirmDiscardChanges } from '@/lib/confirm-discard';
import { confirmLeaveWithDraft } from '@/lib/confirm-leave-draft';
import type { AppLanguage } from '@/lib/i18n/stages';

export function defaultFormSerialize<T>(value: T): string {
  return JSON.stringify(value);
}

/**
 * Tracks whether `current` differs from the snapshot taken when `open` becomes true
 * or when `resetKey` changes while open.
 */
export function useFormDirty<T>(
  open: boolean,
  baseline: T,
  current: T,
  serialize: (value: T) => string = defaultFormSerialize,
  resetKey?: string,
): boolean {
  const serializedBaseline = useMemo(
    () => serialize(baseline),
    // Baseline is re-snapshotted when the modal opens or the form session key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline is tied to resetKey / open
    [open, resetKey],
  );

  if (!open) {
    return false;
  }

  return serialize(current) !== serializedBaseline;
}

type UseConfirmCloseOptions = {
  open: boolean;
  dirty: boolean;
  onClose: () => void;
  disabled?: boolean;
  language: AppLanguage;
  /** When set, dirty leave uses 3-way Stay / Discard / Save draft. */
  onSaveDraft?: () => void;
  onDiscard?: () => void;
};

/**
 * Returns requestClose — use for overlay, X, Cancel, and Escape when a form may have unsaved edits.
 */
export function useConfirmClose({
  open,
  dirty,
  onClose,
  disabled = false,
  language,
  onSaveDraft,
  onDiscard,
}: UseConfirmCloseOptions) {
  const requestClose = useCallback(async () => {
    if (disabled) return;
    if (dirty) {
      if (onSaveDraft) {
        const action = await confirmLeaveWithDraft(language);
        if (action === 'stay') return;
        if (action === 'discard') onDiscard?.();
        if (action === 'saveDraft') onSaveDraft();
      } else {
        const leave = await confirmDiscardChanges(language);
        if (!leave) return;
      }
    }
    onClose();
  }, [dirty, disabled, language, onClose, onDiscard, onSaveDraft]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      void requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, requestClose]);

  return { requestClose };
}
