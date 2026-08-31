'use client';

import { useCallback } from 'react';
import { deletePhotoViaApi } from '@/lib/gallery/photo-api';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

export function useDeletePhoto() {
  const deletePhoto = useCallback(async (photo: GalleryPhoto) => {
    await deletePhotoViaApi(photo.id, photo.storagePath);
    await withoutAutoSyncAsync(async () => {
      useStore.setState({
        photos: (useStore.getState().photos as GalleryPhoto[]).filter((p) => p.id !== photo.id),
      });
    });
  }, []);

  return { deletePhoto };
}
