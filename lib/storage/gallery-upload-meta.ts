import { z } from 'zod';
import { ALLOWED_IMAGE_MIME } from '@/lib/storage/photo-limits';
import { UNSORTED_FOLDER_ID } from '@/lib/gallery/photo-folders';

export const galleryPhotoMetaSchema = z.object({
  photoId: z.string().min(1).max(64),
  caption: z.string().max(500).optional().default(''),
  region: z.string().max(64).optional().default('north'),
  tags: z.array(z.string().max(80)).max(40).optional().default([]),
  folderId: z.string().min(1).max(64).optional().default(UNSORTED_FOLDER_ID),
});

export const galleryUploadInitSchema = z.object({
  photoId: z.string().min(1).max(64),
  fileName: z.string().min(1).max(255),
  mime: z.enum(ALLOWED_IMAGE_MIME),
  totalBytes: z.number().int().positive(),
});

export function processingErrorStatus(message: string): number {
  return /too large to process safely|too heavy for this machine|could not process image|compress or resize/i.test(
    message
  )
    ? 422
    : 500;
}
