'use client';

import { useMemo, useState } from 'react';
import { useEnsureGalleryCatalogLoaded } from '@/hooks/useEnsureGalleryCatalogLoaded';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import {
  childFolders,
  countPhotosInFolder,
  ensureUnsortedFolder,
  folderBreadcrumb,
  UNSORTED_FOLDER_ID,
  type PhotoFolder,
} from '@/lib/gallery/photo-folders';
import GalleryFolderBreadcrumb from '@/components/gallery/GalleryFolderBreadcrumb';
import GalleryFolderGrid from '@/components/gallery/GalleryFolderGrid';
import StorageImage from '@/components/gallery/StorageImage';
import EmptyState from '@/components/EmptyState';

type Props = {
  open: boolean;
  photos: GalleryPhoto[];
  folders: PhotoFolder[];
  onClose: () => void;
  onPick: (photo: GalleryPhoto) => void;
};

/** Mini Photo Gallery: root folder tiles first, then photos inside a folder. */
export default function CompanyLogoGalleryPicker({
  open,
  photos,
  folders: foldersProp,
  onClose,
  onPick,
}: Props) {
  const { loading: galleryLoading } = useEnsureGalleryCatalogLoaded(open);
  const folders = useMemo(() => ensureUnsortedFolder(foldersProp ?? []), [foldersProp]);
  const [folderId, setFolderId] = useState<string | null>(null);

  const atRoot = folderId === null;
  const breadcrumb = useMemo(() => folderBreadcrumb(folders, folderId), [folders, folderId]);
  const visibleFolders = useMemo(() => childFolders(folders, folderId), [folders, folderId]);

  const photoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) {
      counts[f.id] = countPhotosInFolder(photos, f.id);
    }
    return counts;
  }, [folders, photos]);

  const folderPhotos = useMemo(() => {
    if (atRoot) return [];
    return photos.filter((p) => (p.folderId || UNSORTED_FOLDER_ID) === folderId);
  }, [photos, folderId, atRoot]);

  if (!open) return null;

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal logo-gallery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <div>
            <div className="phlib-modal-title">Choose company logo</div>
            <div className="phlib-modal-sub">
              {atRoot ? 'Open a folder, then click a photo' : 'Click a photo to crop'}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="logo-gallery-body">
          {!atRoot && (
            <div className="logo-gallery-nav">
              <GalleryFolderBreadcrumb
                trail={breadcrumb}
                onGoRoot={() => setFolderId(null)}
                onGoFolder={(id) => setFolderId(id)}
              />
            </div>
          )}

            <p className="logo-gallery-hint">
              {galleryLoading && foldersProp.length === 0
                ? 'Đang tải thư mục…'
                : atRoot
                  ? `${visibleFolders.length} folder${visibleFolders.length === 1 ? '' : 's'} · pick one to browse photos`
                  : `${folderPhotos.length} photo${folderPhotos.length === 1 ? '' : 's'} in this folder`}
            </p>

          {visibleFolders.length > 0 && !(galleryLoading && foldersProp.length === 0) && (
            <GalleryFolderGrid
              className="logo-gallery-folders"
              folders={visibleFolders}
              photoCounts={photoCounts}
              onOpen={(id) => setFolderId(id)}
            />
          )}

          {atRoot && visibleFolders.length === 0 && galleryLoading && foldersProp.length === 0 && (
            <p className="logo-gallery-hint" aria-busy="true">
              Đang tải thư viện ảnh…
            </p>
          )}

          {atRoot && visibleFolders.length === 0 && !(galleryLoading && foldersProp.length === 0) && (
            <EmptyState
              className="crm-empty-state--flush"
              variant="photos"
              title="No folders yet"
              description="Create folders in Photo Gallery, then pick a logo here."
            />
          )}

          {!atRoot && (
            <>
              {folderPhotos.length > 0 ? (
                <div className="logo-gallery-photos">
                  {folderPhotos.map((p) => {
                    const thumb = photoThumbUrl(p) || p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="logo-gallery-photo"
                        onClick={() => onPick(p)}
                        title={p.caption || p.id}
                      >
                        <span className="logo-gallery-photo-media">
                          {thumb ? (
                            <StorageImage
                              src={thumb}
                              alt={p.caption || 'Photo'}
                              fill
                              sizes="160px"
                              className="phlib-img"
                            />
                          ) : (
                            <span className="phlib-missing">No image</span>
                          )}
                        </span>
                        <span className="logo-gallery-photo-cap">{p.caption || p.id}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                visibleFolders.length === 0 && (
                  <EmptyState
                    className="crm-empty-state--flush crm-empty-state--inline"
                    size="compact"
                    variant="photos"
                    title="No photos in this folder"
                    description="Go back and try another folder."
                  />
                )
              )}
            </>
          )}
        </div>

        <div className="phlib-modal-ft logo-gallery-ft">
          <div />
          <button type="button" className="btn btn-o" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
