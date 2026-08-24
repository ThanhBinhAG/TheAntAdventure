'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type {
  PhotoFolderCreateBody,
  PhotoFolderPatchBody,
} from '@/lib/gallery/gallery-list-input';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';

type FolderMutationResponse = {
  ok?: boolean;
  error?: string;
  folder?: PhotoFolder;
};

async function readJson(res: Response): Promise<FolderMutationResponse> {
  try {
    return (await res.json()) as FolderMutationResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function usePhotoFolderMutations() {
  const createFolder = useCallback(async (input: PhotoFolderCreateBody) => {
    const res = await fetch('/api/photo-folders', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await readJson(res);
    if (!res.ok || !body.ok || !body.folder) {
      throw new Error(body.error || 'Không thể tạo thư mục.');
    }

    await withoutAutoSyncAsync(async () => {
      useStore.setState({
        photoFolders: [...(useStore.getState().photoFolders as PhotoFolder[]), body.folder!],
      });
    });
    return body.folder;
  }, []);

  const renameFolder = useCallback(async (folderId: string, patch: PhotoFolderPatchBody) => {
    const res = await fetch(`/api/photo-folders/${encodeURIComponent(folderId)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = await readJson(res);
    if (!res.ok || !body.ok || !body.folder) {
      throw new Error(body.error || 'Không thể đổi tên thư mục.');
    }

    await withoutAutoSyncAsync(async () => {
      useStore.setState({
        photoFolders: (useStore.getState().photoFolders as PhotoFolder[]).map((folder) =>
          folder.id === body.folder!.id ? body.folder! : folder,
        ),
      });
    });
    return body.folder;
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    const res = await fetch(`/api/photo-folders/${encodeURIComponent(folderId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const body = await readJson(res);
    if (!res.ok || !body.ok) {
      throw new Error(body.error || 'Không thể xóa thư mục.');
    }

    await withoutAutoSyncAsync(async () => {
      useStore.setState({
        photoFolders: (useStore.getState().photoFolders as PhotoFolder[]).filter(
          (folder) => folder.id !== folderId,
        ),
      });
    });
  }, []);

  return { createFolder, renameFolder, deleteFolder };
}
