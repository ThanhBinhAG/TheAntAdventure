/**
 * Client-side variants — guide avatars only.
 * Gallery uploads go through POST /api/photos/upload (Sharp on the server).
 */
import imageCompression from 'browser-image-compression';
import { z } from 'zod';
import { ALLOWED_IMAGE_MIME, MAX_INPUT_BYTES, MAX_INPUT_ERROR } from '@/lib/storage/photo-limits';

export const galleryImageFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_INPUT_BYTES, MAX_INPUT_ERROR)
  .refine(
    (f) => ALLOWED_IMAGE_MIME.includes(f.type as (typeof ALLOWED_IMAGE_MIME)[number]),
    'Only JPEG, PNG, and WebP images are supported'
  );

async function compressVariant(file: File, maxWidthOrHeight: number, maxSizeMB: number, initialQuality: number): Promise<File> {
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality,
  });
}

export async function processAvatarVariant(file: File): Promise<File> {
  galleryImageFileSchema.parse(file);
  return compressVariant(file, 256, 0.06, 0.8);
}
