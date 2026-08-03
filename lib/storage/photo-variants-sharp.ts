import 'server-only';
import sharp from 'sharp';
import { z } from 'zod';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

export const galleryImageBufferSchema = z.object({
  buffer: z.custom<Buffer>((v) => Buffer.isBuffer(v), 'Expected Buffer').refine(
    (b) => b.byteLength <= MAX_INPUT_BYTES,
    'Image must be 10 MB or smaller'
  ),
  mime: z.enum(ALLOWED_MIME),
});

export type ImageVariantBuffers = {
  thumb: Buffer;
  display: Buffer;
  displayBytes: number;
};

async function toWebp(input: Buffer, maxEdge: number, quality: number): Promise<Buffer> {
  return sharp(input)
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
  const [thumb, display] = await Promise.all([
    toWebp(input, 400, 75),
    toWebp(input, 1280, 82),
  ]);
  return { thumb, display, displayBytes: display.byteLength };
}
