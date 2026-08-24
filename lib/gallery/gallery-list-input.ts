import { z } from 'zod';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';

export const GALLERY_PAGE_SIZES = [12, 24, 48, 96] as const;

export type GalleryPageSize = (typeof GALLERY_PAGE_SIZES)[number];

export type GalleryListFilters = {
  q?: string;
  folderId?: string;
  region?: string;
};

export const galleryListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page phải là số nguyên.')
    .min(1, 'page phải lớn hơn hoặc bằng 1.')
    .default(1),
  pageSize: z
    .enum(['12', '24', '48', '96'])
    .transform((value) => Number(value) as GalleryPageSize)
    .default(24),
  q: z.string().trim().min(1).max(200).optional(),
  folderId: z.string().trim().min(1).max(64).optional(),
  region: z.string().trim().min(1).max(64).optional(),
});

export type GalleryListQuery = z.infer<typeof galleryListQuerySchema>;

export type GalleryListItem = GalleryPhoto;

export type GalleryPageResponse = {
  items: GalleryListItem[];
  page: number;
  pageSize: GalleryPageSize;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export const galleryPhotoPatchBodySchema = z.object({
  caption: z.string().trim().min(1).max(500).optional(),
  region: z.string().trim().min(1).max(64).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
  folderId: z.string().trim().min(1).max(64).optional(),
});

export type GalleryPhotoPatchBody = z.infer<typeof galleryPhotoPatchBodySchema>;

export const photoFolderCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentId: z.string().trim().min(1).max(64).nullable().optional(),
});

export type PhotoFolderCreateBody = z.infer<typeof photoFolderCreateBodySchema>;

export const photoFolderPatchBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export type PhotoFolderPatchBody = z.infer<typeof photoFolderPatchBodySchema>;

export type PhotoFolderListItem = PhotoFolder;

export function optionalGalleryQueryParam(
  url: URL,
  name: string,
): string | undefined {
  return url.searchParams.get(name) || undefined;
}
