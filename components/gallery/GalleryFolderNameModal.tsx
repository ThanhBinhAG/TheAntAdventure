'use client';

import { useState } from 'react';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { tp, tc, language } = useLanguage();
  const [name, setName] = useState(initialName);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName(initialName);
  }

  const formKey = `${open}-${initialName}`;
  const dirty = useFormDirty(open, initialName, name, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  return (
    <div className="overlay open" onClick={() => void requestClose()} role="presentation">
      <div className="modal phlib-folder-name-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div className="phlib-modal-title">{title}</div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()} disabled={saving}>
            ✕
          </button>
        </div>
        <div className="phlib-modal-bd">
          <label className="phlib-folder-name-label">
            {tp('gallery', 'folderNameLabel')}
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
            <button type="button" className="btn btn-o" onClick={() => void requestClose()} disabled={saving}>
              {tc('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-g"
              disabled={!name.trim() || saving}
              onClick={() => onSubmit(name.trim())}
            >
              {tc('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
