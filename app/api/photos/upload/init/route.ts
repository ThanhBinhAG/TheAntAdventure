import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { createGalleryUploadSession } from '@/lib/image-pipeline/upload-session';
import { galleryUploadInitSchema } from '@/lib/storage/gallery-upload-meta';
import { GALLERY_CHUNK_BYTES } from '@/lib/storage/photo-limits';
import { checkAndRecordGalleryUploadRateLimit } from '@/lib/storage/gallery-upload-rate-limit';

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = galleryUploadInitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid init payload' },
      { status: 400 }
    );
  }

  const userId = auth.userId ?? auth.email ?? 'authenticated';

  const rate = await checkAndRecordGalleryUploadRateLimit(userId, parsed.data.totalBytes);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many uploads. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
    );
  }

  try {
    const meta = await createGalleryUploadSession({
      photoId: parsed.data.photoId,
      mime: parsed.data.mime,
      fileName: parsed.data.fileName,
      totalBytes: parsed.data.totalBytes,
      userId,
    });
    return NextResponse.json({
      ok: true,
      uploadId: meta.uploadId,
      chunkBytes: GALLERY_CHUNK_BYTES,
      totalChunks: meta.totalChunks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Init failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
