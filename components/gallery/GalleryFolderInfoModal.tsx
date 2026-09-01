'use client';

import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  open: boolean;
  folder: PhotoFolder | null;
  pathLabel: string;
  photoCount: number;
  onClose: () => void;
};

export default function GalleryFolderInfoModal({
  open,
  folder,
  pathLabel,
  photoCount,
  onClose,
}: Props) {
  const { tp, tpl, tc } = useLanguage();

  if (!open || !folder) return null;

  const photoCountLabel =
    photoCount === 1
      ? tpl('gallery', 'infoPhotoCountOne', { count: photoCount })
      : tpl('gallery', 'infoPhotoCountMany', { count: photoCount });

  return (
    <div className="overlay open" onClick={onClose} role="presentation">
      <div
        className="modal phlib-folder-info-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phlib-folder-info-title"
      >
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title" id="phlib-folder-info-title">
              {tp('gallery', 'folderInfoTitle')}
            </div>
            <div className="phlib-modal-sub">{folder.name}</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="phlib-modal-bd phlib-folder-info-body">
          <dl className="phlib-folder-info-dl">
            <div>
              <dt>{tp('gallery', 'infoName')}</dt>
              <dd>{folder.name}</dd>
            </div>
            <div>
              <dt>{tp('gallery', 'infoPath')}</dt>
              <dd>{pathLabel}</dd>
            </div>
            <div>
              <dt>{tp('gallery', 'infoPhotos')}</dt>
              <dd>{photoCountLabel}</dd>
            </div>
            <div>
              <dt>{tp('gallery', 'infoId')}</dt>
              <dd>
                <code>{folder.id}</code>
              </dd>
            </div>
            <div>
              <dt>{tp('gallery', 'infoType')}</dt>
              <dd>{folder.isSystem ? tp('gallery', 'systemFolder') : tp('gallery', 'userFolder')}</dd>
            </div>
            {folder.createdAt && (
              <div>
                <dt>{tp('gallery', 'infoCreated')}</dt>
                <dd>{new Date(folder.createdAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="phlib-modal-ft">
          <div />
          <div className="phlib-modal-ft-right">
            <button type="button" className="btn btn-g" onClick={onClose}>
              {tc('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
