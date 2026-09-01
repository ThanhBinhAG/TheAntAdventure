'use client';

import { useMemo, useState } from 'react';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { folderTreeRows } from '@/lib/gallery/photo-folders';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { tp, tpl, tc, language } = useLanguage();
  const rows = useMemo(() => folderTreeRows(folders), [folders]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTargetId(null);
  }

  const dirty = useFormDirty(open, null, targetId, (v) => String(v), `${open}-${currentFolderId}`);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  const effectiveTarget = targetId ?? rows.find((r) => r.folder.id !== currentFolderId)?.folder.id ?? null;
  const titleKey = photoCount === 1 ? 'movePhotosTitleOne' : 'movePhotosTitleMany';

  return (
    <div className="overlay open" onClick={() => void requestClose()} role="presentation">
      <div className="modal phlib-move-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title">{tpl('gallery', titleKey, { count: photoCount })}</div>
            <div className="phlib-modal-sub">{tp('gallery', 'movePhotosSubtitle')}</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()} disabled={saving}>
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
                {folder.isSystem && <span className="phlib-move-badge">{tp('gallery', 'badgeSystem')}</span>}
                {disabled && <span className="phlib-move-badge">{tp('gallery', 'badgeCurrent')}</span>}
              </button>
            );
          })}
          {!rows.length && <div className="phlib-move-empty">{tp('gallery', 'moveNoFolders')}</div>}
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
              disabled={!effectiveTarget || saving}
              onClick={() => effectiveTarget && onConfirm(effectiveTarget)}
            >
              {saving ? tp('gallery', 'moving') : tp('gallery', 'moveHere')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
