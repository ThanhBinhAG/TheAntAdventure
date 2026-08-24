import 'server-only';

import {
  type GalleryListQuery,
  type GalleryPageResponse,
  type GalleryPhotoPatchBody,
  type PhotoFolderCreateBody,
  type PhotoFolderPatchBody,
} from '@/lib/gallery/gallery-list-input';
import {
  canDeleteFolder,
  nextFolderId,
  UNSORTED_FOLDER_ID,
  type PhotoFolder,
} from '@/lib/gallery/photo-folders';
import {
  photoFolderToRow,
  rowToPhoto,
  rowToPhotoFolder,
} from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

export class GalleryRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: 'config' | 'query' | 'not_found' | 'blocked' | 'conflict' = 'query',
  ) {
    super(message);
    this.name = 'GalleryRepositoryError';
  }
}

type GallerySupabaseClient = Awaited<ReturnType<typeof createGalleryServerClient>>;

async function createGalleryServerClient() {
  try {
    return await getServerSupabaseClient();
  } catch (error) {
    throw new GalleryRepositoryError(
      error instanceof Error
        ? error.message
        : 'CRM session không hợp lệ hoặc Supabase chưa được cấu hình.',
      'config',
    );
  }
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

function mapPhotoRow(raw: Row, tags: string[]): GalleryPhoto {
  return rowToPhoto(raw, tags) as GalleryPhoto;
}

async function fetchPhotoTagsByIds(
  supabase: GallerySupabaseClient,
  photoIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!photoIds.length) return out;

  const { data, error } = await supabase
    .from('photo_tags')
    .select('photo_id, tag')
    .in('photo_id', photoIds);
  if (error) throw new GalleryRepositoryError(error.message);

  for (const row of data ?? []) {
    const id = String((row as Row).photo_id);
    if (!out.has(id)) out.set(id, []);
    out.get(id)!.push(String((row as Row).tag));
  }
  return out;
}

async function fetchPhotosWithTags(
  supabase: GallerySupabaseClient,
  rows: Row[],
): Promise<GalleryPhoto[]> {
  const tagMap = await fetchPhotoTagsByIds(
    supabase,
    rows.map((row) => String(row.id)),
  );
  return rows.map((row) => mapPhotoRow(row, tagMap.get(String(row.id)) ?? []));
}

export async function getAllGalleryPhotosServer(): Promise<GalleryPhoto[]> {
  const supabase = await createGalleryServerClient();
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new GalleryRepositoryError(error.message);
  return fetchPhotosWithTags(supabase, (data ?? []) as Row[]);
}

export async function listPhotosPage(
  input: GalleryListQuery,
): Promise<GalleryPageResponse> {
  const supabase = await createGalleryServerClient();

  let query = supabase.from('photos').select('*', { count: 'exact' });

  if (input.folderId) {
    query = query.eq('folder_id', input.folderId);
  }
  if (input.region) {
    query = query.eq('region', input.region);
  }
  if (input.q) {
    const safeQ = input.q.replace(/[,()]/g, ' ').trim();
    if (safeQ) {
      const pattern = `%${escapeIlike(safeQ)}%`;
      query = query.or(
        [`caption.ilike.${pattern}`, `id.ilike.${pattern}`, `region.ilike.${pattern}`].join(','),
      );
    }
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  const { data, error, count } = await query.order('id', { ascending: true }).range(from, to);
  if (error) throw new GalleryRepositoryError(error.message);

  const items = await fetchPhotosWithTags(supabase, (data ?? []) as Row[]);
  const totalCount = count ?? 0;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize);

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: input.page > 1 && totalPages > 0,
    hasNextPage: input.page < totalPages,
  };
}

export async function getPhotoById(id: string): Promise<GalleryPhoto> {
  const supabase = await createGalleryServerClient();
  const { data, error } = await supabase.from('photos').select('*').eq('id', id).maybeSingle();
  if (error) throw new GalleryRepositoryError(error.message);
  if (!data) throw new GalleryRepositoryError('Không tìm thấy ảnh.', 'not_found');

  const tagMap = await fetchPhotoTagsByIds(supabase, [id]);
  return mapPhotoRow(data as Row, tagMap.get(id) ?? []);
}

async function replacePhotoTags(
  supabase: GallerySupabaseClient,
  photoId: string,
  tags: string[],
): Promise<void> {
  const { error: deleteError } = await supabase.from('photo_tags').delete().eq('photo_id', photoId);
  if (deleteError) throw new GalleryRepositoryError(deleteError.message);
  if (!tags.length) return;

  const { error: insertError } = await supabase.from('photo_tags').insert(
    tags.map((tag) => ({ photo_id: photoId, tag })),
  );
  if (insertError) throw new GalleryRepositoryError(insertError.message);
}

export async function updatePhoto(
  id: string,
  patch: GalleryPhotoPatchBody,
): Promise<GalleryPhoto> {
  const supabase = await createGalleryServerClient();
  const rowPatch: Row = {};
  if (patch.caption !== undefined) rowPatch.caption = patch.caption;
  if (patch.region !== undefined) rowPatch.region = patch.region;
  if (patch.folderId !== undefined) rowPatch.folder_id = patch.folderId;

  if (Object.keys(rowPatch).length) {
    const { error } = await supabase.from('photos').update(rowPatch).eq('id', id);
    if (error) throw new GalleryRepositoryError(error.message);
  }

  if (patch.tags !== undefined) {
    await replacePhotoTags(supabase, id, patch.tags);
  }

  return getPhotoById(id);
}

export async function listPhotoFoldersServer(): Promise<PhotoFolder[]> {
  const supabase = await createGalleryServerClient();
  const { data, error } = await supabase
    .from('photo_folders')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new GalleryRepositoryError(error.message);

  return ((data ?? []) as Row[]).map((row) => rowToPhotoFolder(row) as PhotoFolder);
}

export async function createPhotoFolder(
  input: PhotoFolderCreateBody,
): Promise<PhotoFolder> {
  const supabase = await createGalleryServerClient();
  const folders = await listPhotoFoldersServer();
  const parentId = input.parentId ?? null;
  const folder: PhotoFolder = {
    id: nextFolderId(folders),
    name: input.name.trim(),
    parentId,
    sortOrder: folders.filter((f) => (f.parentId ?? null) === parentId).length,
    isSystem: false,
  };

  const { error } = await supabase.from('photo_folders').insert(photoFolderToRow(folder as unknown as Row));
  if (error) throw new GalleryRepositoryError(error.message);
  return folder;
}

export async function updatePhotoFolder(
  id: string,
  patch: PhotoFolderPatchBody,
): Promise<PhotoFolder> {
  const supabase = await createGalleryServerClient();
  const folders = await listPhotoFoldersServer();
  const folder = folders.find((f) => f.id === id);
  if (!folder) throw new GalleryRepositoryError('Không tìm thấy thư mục.', 'not_found');
  if (folder.isSystem || id === UNSORTED_FOLDER_ID) {
    throw new GalleryRepositoryError('Không thể đổi tên thư mục hệ thống.', 'blocked');
  }

  const { error } = await supabase
    .from('photo_folders')
    .update({ name: patch.name.trim() })
    .eq('id', id);
  if (error) throw new GalleryRepositoryError(error.message);

  return { ...folder, name: patch.name.trim() };
}

export async function deletePhotoFolder(id: string): Promise<void> {
  const supabase = await createGalleryServerClient();
  const folders = await listPhotoFoldersServer();
  const photos = await getAllGalleryPhotosServer();
  const check = canDeleteFolder(folders, id, photos);
  if (!check.ok) {
    throw new GalleryRepositoryError(check.reason ?? 'Không thể xóa thư mục.', 'blocked');
  }

  const { error } = await supabase.from('photo_folders').delete().eq('id', id);
  if (error) throw new GalleryRepositoryError(error.message);
}
