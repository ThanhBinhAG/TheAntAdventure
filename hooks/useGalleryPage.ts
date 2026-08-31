'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { getBffArray } from '@/lib/bff/client';

const galleryGetInflight = new Map<
  string,
  Promise<{
    response: Response;
    body: unknown;
  }>
>();

export function fetchGalleryJsonOnce(url: string) {
  const existing = galleryGetInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      galleryGetInflight.delete(url);
    });

  galleryGetInflight.set(url, request);
  return request;
}

type PhotoFoldersApiResponse = {
  ok: true;
  items: PhotoFolder[];
};

function isPhotoFoldersApiResponse(value: unknown): value is PhotoFoldersApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

export function useGalleryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLibrary() {
      setLoading(true);
      setError(null);
      try {
        const [foldersResult, photos] = await Promise.all([
          fetchGalleryJsonOnce('/api/photo-folders'),
          getBffArray<GalleryPhoto>('/api/photos/all', 'Không thể tải thư viện ảnh.'),
        ]);

        if (!foldersResult.response.ok || !isPhotoFoldersApiResponse(foldersResult.body)) {
          throw new Error('Không thể tải thư mục ảnh.');
        }
        const folderItems = foldersResult.body.items;

        if (active) {
          await withoutAutoSyncAsync(async () => {
            useStore.setState({
              photoFolders: folderItems,
              photos,
            });
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Không thể tải thư viện ảnh.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLibrary();

    return () => {
      active = false;
    };
  }, [requestVersion]);

  return { loading, error, reload };
}
