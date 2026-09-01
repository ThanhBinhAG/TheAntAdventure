'use client';

import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  trail: PhotoFolder[];
  onGoRoot: () => void;
  onGoFolder: (folderId: string) => void;
};

export default function GalleryFolderBreadcrumb({ trail, onGoRoot, onGoFolder }: Props) {
  const { tp } = useLanguage();

  if (!trail.length) return null;

  return (
    <nav className="phlib-breadcrumb" aria-label={tp('gallery', 'folderPathAria')}>
      <button type="button" className="phlib-breadcrumb-item" onClick={onGoRoot}>
        {tp('gallery', 'libraryBreadcrumb')}
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
