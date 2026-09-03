'use client';

import type { FormDraftListItem } from '@/lib/form-drafts/storage';

type FormDraftsBarProps = {
  drafts: FormDraftListItem[];
  label: string;
  addPrefix: string;
  editPrefix: string;
  dismissTitle: string;
  onOpen: (draft: FormDraftListItem) => void;
  onDismiss: (draft: FormDraftListItem) => void;
};

export default function FormDraftsBar({
  drafts,
  label,
  addPrefix,
  editPrefix,
  dismissTitle,
  onOpen,
  onDismiss,
}: FormDraftsBarProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="form-drafts-bar" role="region" aria-label={label}>
      <span className="form-drafts-bar-lbl">{label}</span>
      <div className="form-drafts-chips">
        {drafts.map((draft) => {
          const prefix = draft.mode === 'edit' ? editPrefix : addPrefix;
          return (
            <button
              key={`${draft.mode}-${draft.id}`}
              type="button"
              className="form-draft-chip"
              onClick={() => onOpen(draft)}
              title={draft.label}
            >
              <span className="form-draft-chip-text">
                {prefix}
                {draft.label}
              </span>
              <span
                className="form-draft-chip-x"
                role="button"
                tabIndex={0}
                title={dismissTitle}
                aria-label={dismissTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(draft);
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  e.stopPropagation();
                  onDismiss(draft);
                }}
              >
                ×
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
