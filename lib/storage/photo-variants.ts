/**
 * Client-side variants — guide avatars only.
 *
 * Gallery library uploads use the server Sharp pipeline (`lib/image-pipeline/`).
 * The 20 MB cap below applies to avatar picks alone.
 */
import imageCompression from 'browser-image-compression';
import { z } from 'zod';
import { ALLOWED_IMAGE_MIME } from '@/lib/storage/photo-limits';

/** Soft cap for avatar picks before client compress (avatars stay small). */
const AVATAR_PICK_MAX_BYTES = 20 * 1024 * 1024;

export const avatarImageFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= AVATAR_PICK_MAX_BYTES, 'Avatar image must be 20 MB or smaller')
  .refine(
    (f) => ALLOWED_IMAGE_MIME.includes(f.type as (typeof ALLOWED_IMAGE_MIME)[number]),
    'Only JPEG, PNG, and WebP images are supported'
  );

async function compressVariant(
  file: File,
  maxWidthOrHeight: number,
  maxSizeMB: number,
  initialQuality: number
): Promise<File> {
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality,
  });
}

export async function processAvatarVariant(file: File): Promise<File> {
  avatarImageFileSchema.parse(file);
  return compressVariant(file, 256, 0.06, 0.8);
}
