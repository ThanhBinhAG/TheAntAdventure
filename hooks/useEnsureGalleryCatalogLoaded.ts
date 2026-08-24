'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { fetchGalleryJsonOnce } from '@/hooks/useGalleryPage';
import { getBffArray } from '@/lib/bff/client';

type PhotoFoldersApiResponse = {
  ok: true;
  items: PhotoFolder[];
};

let catalogSessionLoaded = false;
let catalogLoadPromise: Promise<void> | null = null;

function isPhotoFoldersApiResponse(value: unknown): value is PhotoFoldersApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

/** Lazy-load gallery catalog for pickers via CRM BFF (no PostgREST hydrate). */
export function useEnsureGalleryCatalogLoaded(enabled: boolean): { loading: boolean } {
  const [loading, setLoading] = useState(false);

  const ensureCatalog = useCallback(async () => {
    if (catalogSessionLoaded) return;
    if (catalogLoadPromise) {
      await catalogLoadPromise;
      return;
    }

    catalogLoadPromise = (async () => {
      setLoading(true);
      try {
        const [foldersResult, photos] = await Promise.all([
          fetchGalleryJsonOnce('/api/photo-folders'),
          getBffArray<GalleryPhoto>('/api/photos/all', 'Không thể tải thư viện ảnh.'),
        ]);

        if (!foldersResult.response.ok || !isPhotoFoldersApiResponse(foldersResult.body)) {
          throw new Error('Không thể tải thư mục ảnh.');
        }
        const folderItems = foldersResult.body.items;

        await withoutAutoSyncAsync(async () => {
          useStore.setState({
            photoFolders: folderItems,
            photos,
          });
        });
        catalogSessionLoaded = true;
      } finally {
        setLoading(false);
        catalogLoadPromise = null;
      }
    })();

    await catalogLoadPromise;
  }, []);

  useEffect(() => {
    if (!enabled || catalogSessionLoaded) return;
    void ensureCatalog();
  }, [enabled, ensureCatalog]);

  return { loading: enabled && loading && !catalogSessionLoaded };
}
