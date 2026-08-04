import 'server-only';
import sharp from 'sharp';
import { z } from 'zod';
import { ALLOWED_IMAGE_MIME, MAX_INPUT_BYTES, MAX_INPUT_ERROR } from '@/lib/storage/photo-limits';

export const galleryImageBufferSchema = z.object({
  buffer: z.custom<Buffer>((v) => Buffer.isBuffer(v), 'Expected Buffer').refine(
    (b) => b.byteLength <= MAX_INPUT_BYTES,
    MAX_INPUT_ERROR
  ),
  mime: z.enum(ALLOWED_IMAGE_MIME),
});

export type ImageVariantBuffers = {
  thumb: Buffer;
  display: Buffer;
  displayBytes: number;
};

async function toWebp(input: Buffer, maxEdge: number, quality: number): Promise<Buffer> {
  return sharp(input, { failOn: 'error' })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

export async function processImageVariantsSharp(
  input: Buffer,
  mime: string
): Promise<ImageVariantBuffers> {
  galleryImageBufferSchema.parse({ buffer: input, mime });
  try {
    const [thumb, display] = await Promise.all([
      toWebp(input, 400, 75),
      toWebp(input, 1280, 82),
    ]);
    return { thumb, display, displayBytes: display.byteLength };
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'Image processing failed';
    if (/Input buffer|VipsJpeg|pngload|webp|unsupported|limit/i.test(raw)) {
      throw new Error('Could not process image. Try a smaller JPEG, PNG, or WebP file.');
    }
    throw e instanceof Error ? e : new Error(raw);
  }
}
