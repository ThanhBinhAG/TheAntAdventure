'use client';

import { useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  initialName?: string;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export default function GalleryFolderNameModal({
  open,
  title,
  initialName = '',
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset draft when the modal opens (adjust state while rendering — no effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName(initialName);
  }

  if (!open) return null;

  return (
    <div className="overlay open" onClick={onClose} role="presentation">
      <div className="modal phlib-folder-name-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div className="phlib-modal-title">{title}</div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>
        <div className="phlib-modal-bd">
          <label className="phlib-folder-name-label">
            Name
            <input
              className="phlib-search"
              value={name}
              autoFocus
              disabled={saving}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSubmit(name.trim());
              }}
            />
          </label>
        </div>
        <div className="phlib-modal-ft">
          <div />
          <div className="phlib-modal-ft-right">
            <button type="button" className="btn btn-o" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-g"
              disabled={!name.trim() || saving}
              onClick={() => onSubmit(name.trim())}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
