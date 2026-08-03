'use client';

import type { PhotoFolder } from '@/lib/gallery/photo-folders';

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
  if (!open || !folder) return null;

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
              Folder info
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
              <dt>Name</dt>
              <dd>{folder.name}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd>{pathLabel}</dd>
            </div>
            <div>
              <dt>Photos</dt>
              <dd>
                {photoCount} photo{photoCount === 1 ? '' : 's'}
              </dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>
                <code>{folder.id}</code>
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{folder.isSystem ? 'System folder' : 'User folder'}</dd>
            </div>
            {folder.createdAt && (
              <div>
                <dt>Created</dt>
                <dd>{new Date(folder.createdAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="phlib-modal-ft">
          <div />
          <div className="phlib-modal-ft-right">
            <button type="button" className="btn btn-g" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
