'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { GalleryPhotoPatchBody } from '@/lib/gallery/gallery-list-input';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

export type PhotoUpdateOutcome =
  | { ok: true; photo: GalleryPhoto }
  | { ok: false; error: 'save_failed'; message: string };

type PhotoMutationResponse = {
  ok?: boolean;
  error?: string;
  photo?: GalleryPhoto;
};

async function readJson(res: Response): Promise<PhotoMutationResponse> {
  try {
    return (await res.json()) as PhotoMutationResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useUpdatePhoto() {
  const patchPhoto = useCallback(
    async (photoId: string, patch: GalleryPhotoPatchBody): Promise<PhotoUpdateOutcome> => {
      const res = await fetch(`/api/photos/${encodeURIComponent(photoId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.photo) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật ảnh.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        useStore.setState({
          photos: (useStore.getState().photos as GalleryPhoto[]).map((photo) =>
            photo.id === body.photo!.id ? body.photo! : photo,
          ),
        });
      });

      return { ok: true, photo: body.photo };
    },
    [],
  );

  return { patchPhoto };
}
