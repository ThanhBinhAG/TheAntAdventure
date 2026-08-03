'use client';

import type { PhotoFolder } from '@/lib/gallery/photo-folders';

type Props = {
  trail: PhotoFolder[];
  onGoRoot: () => void;
  onGoFolder: (folderId: string) => void;
};

export default function GalleryFolderBreadcrumb({ trail, onGoRoot, onGoFolder }: Props) {
  if (!trail.length) return null;

  return (
    <nav className="phlib-breadcrumb" aria-label="Folder path">
      <button type="button" className="phlib-breadcrumb-item" onClick={onGoRoot}>
        Library
      </button>
      {trail.map((f) => (
        <span key={f.id} className="phlib-breadcrumb-seg">
          <span className="phlib-breadcrumb-sep" aria-hidden>
            /
          </span>
          <button type="button" className="phlib-breadcrumb-item" onClick={() => onGoFolder(f.id)}>
            {f.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
