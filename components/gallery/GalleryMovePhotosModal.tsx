'use client';

import { useMemo, useState } from 'react';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { folderTreeRows } from '@/lib/gallery/photo-folders';

type Props = {
  open: boolean;
  folders: PhotoFolder[];
  photoCount: number;
  currentFolderId: string | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (folderId: string) => void;
};

export default function GalleryMovePhotosModal({
  open,
  folders,
  photoCount,
  currentFolderId,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const rows = useMemo(() => folderTreeRows(folders), [folders]);
  const [targetId, setTargetId] = useState<string | null>(null);

  if (!open) return null;

  const effectiveTarget = targetId ?? rows.find((r) => r.folder.id !== currentFolderId)?.folder.id ?? null;

  return (
    <div className="overlay open" onClick={onClose} role="presentation">
      <div className="modal phlib-move-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title">Move {photoCount} photo{photoCount === 1 ? '' : 's'}</div>
            <div className="phlib-modal-sub">Choose a destination folder</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>
        <div className="phlib-move-list">
          {rows.map(({ folder, depth }) => {
            const disabled = folder.id === currentFolderId;
            const selected = effectiveTarget === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                className={`phlib-move-row${selected ? ' on' : ''}${disabled ? ' disabled' : ''}`}
                style={{ paddingLeft: 12 + depth * 16 }}
                disabled={disabled || saving}
                onClick={() => setTargetId(folder.id)}
              >
                <span className="phlib-move-folder-icon" aria-hidden />
                <span>{folder.name}</span>
                {folder.isSystem && <span className="phlib-move-badge">system</span>}
                {disabled && <span className="phlib-move-badge">current</span>}
              </button>
            );
          })}
          {!rows.length && <div className="phlib-move-empty">No folders yet. Create one first.</div>}
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
              disabled={!effectiveTarget || saving}
              onClick={() => effectiveTarget && onConfirm(effectiveTarget)}
            >
              {saving ? 'Moving…' : 'Move here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
