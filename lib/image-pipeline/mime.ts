import { promises as fs } from 'node:fs';
import {
  ALLOWED_IMAGE_MIME,
  type AllowedImageMime,
} from '@/lib/image-pipeline/limits';

export function sniffImageMimeFromBuffer(
  buffer: Buffer,
  fileName?: string,
  declaredType?: string
): AllowedImageMime | null {
  if (declaredType && (ALLOWED_IMAGE_MIME as readonly string[]).includes(declaredType)) {
    return declaredType as AllowedImageMime;
  }
  const name = (fileName ?? '').toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export async function sniffImageMimeFromFile(
  filePath: string,
  fileName?: string,
  declaredType?: string
): Promise<AllowedImageMime | null> {
  const fd = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fd.read(buf, 0, 16, 0);
    return sniffImageMimeFromBuffer(buf.subarray(0, bytesRead), fileName, declaredType);
  } finally {
    await fd.close();
  }
}
