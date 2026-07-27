import imageCompression from 'browser-image-compression';
import { z } from 'zod';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export const galleryImageFileSchema = z
  .instanceof(File)
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'Image must be 10 MB or smaller')
  .refine(
    (f) => ALLOWED_MIME.includes(f.type as (typeof ALLOWED_MIME)[number]),
    'Only JPEG, PNG, and WebP images are supported'
  );

export type ImageVariants = {
  thumb: File;
  display: File;
};

async function compressVariant(file: File, maxWidthOrHeight: number, maxSizeMB: number, initialQuality: number): Promise<File> {
  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality,
  });
}

export async function processImageVariants(file: File): Promise<ImageVariants> {
  galleryImageFileSchema.parse(file);
  const [thumb, display] = await Promise.all([
    compressVariant(file, 400, 0.08, 0.75),
    compressVariant(file, 1280, 0.4, 0.82),
  ]);
  return { thumb, display };
}

export async function processAvatarVariant(file: File): Promise<File> {
  galleryImageFileSchema.parse(file);
  return compressVariant(file, 256, 0.06, 0.8);
}
