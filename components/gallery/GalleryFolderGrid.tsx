'use client';

import { useDroppable } from '@dnd-kit/core';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { UNSORTED_FOLDER_ID } from '@/lib/gallery/photo-folders';

function FolderTile({
  folder,
  photoCount,
  onOpen,
  onRename,
  onDelete,
  onInfo,
  droppable,
}: {
  folder: PhotoFolder;
  photoCount: number;
  onOpen: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onInfo?: () => void;
  droppable?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: { folderId: folder.id },
    disabled: !droppable,
  });

  return (
    <article
      ref={setNodeRef}
      className={`phlib-folder-card${isOver ? ' drop-over' : ''}${folder.isSystem ? ' system' : ''}`}
    >
      <button type="button" className="phlib-folder-open" onDoubleClick={onOpen} onClick={onOpen}>
        <span className={`phlib-folder-icon${folder.id === UNSORTED_FOLDER_ID ? ' inbox' : ''}`} aria-hidden />
        <span className="phlib-folder-name">{folder.name}</span>
        <span className="phlib-folder-count">
          {photoCount} photo{photoCount === 1 ? '' : 's'}
        </span>
      </button>
      <div className="phlib-folder-actions">
        {onInfo && (
          <button type="button" onClick={onInfo}>
            Info
          </button>
        )}
        {!folder.isSystem && onRename && (
          <button type="button" onClick={onRename}>
            Rename
          </button>
        )}
        {!folder.isSystem && onDelete && (
          <button type="button" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

type Props = {
  folders: PhotoFolder[];
  photoCounts: Record<string, number>;
  onOpen: (folderId: string) => void;
  onRename?: (folder: PhotoFolder) => void;
  onDelete?: (folder: PhotoFolder) => void;
  onInfo?: (folder: PhotoFolder) => void;
  /** Enable drop targets for moving photos onto folders. */
  acceptPhotoDrop?: boolean;
};

export default function GalleryFolderGrid({
  folders,
  photoCounts,
  onOpen,
  onRename,
  onDelete,
  onInfo,
  acceptPhotoDrop = false,
}: Props) {
  if (!folders.length) return null;
  return (
    <div className="phlib-folder-grid">
      {folders.map((f) => (
        <FolderTile
          key={f.id}
          folder={f}
          photoCount={photoCounts[f.id] ?? 0}
          onOpen={() => onOpen(f.id)}
          onRename={onRename ? () => onRename(f) : undefined}
          onDelete={onDelete ? () => onDelete(f) : undefined}
          onInfo={onInfo ? () => onInfo(f) : undefined}
          droppable={acceptPhotoDrop}
        />
      ))}
    </div>
  );
}
