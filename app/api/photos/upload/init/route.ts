import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { createGalleryUploadSession } from '@/lib/image-pipeline/upload-session';
import { galleryUploadInitSchema } from '@/lib/storage/gallery-upload-meta';
import { GALLERY_CHUNK_BYTES } from '@/lib/storage/photo-limits';
import { checkAndRecordGalleryUploadRateLimit } from '@/lib/storage/gallery-upload-rate-limit';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const maxDuration = 60;

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'gallery/upload/init', route: '/api/photos/upload/init' },
  async (request, _context, { logger }) => {
  const permission = await checkPermissionForRequest('gallery.write');
  if (!permission.allowed) {
    logger.warn({ event: 'gallery.permission.denied', statusCode: permission.status }, 'Gallery permission denied');
    return NextResponse.json(
      { ok: false, error: permission.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: permission.status },
    );
  }

  const auth = await getAuthContext();
  const userId = auth.userId ?? auth.email ?? 'authenticated';

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
      { status: 400 },
    );
  }

  const rate = await checkAndRecordGalleryUploadRateLimit(userId, parsed.data.totalBytes);
  if (!rate.ok) {
    logger.warn({ event: 'gallery.upload.init.rate_limited', statusCode: 429 }, 'Gallery upload initialization rate limited');
    return NextResponse.json(
      { ok: false, error: 'Too many uploads. Please wait a bit and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
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
    logger.info({ event: 'gallery.upload.initialized' }, 'Gallery upload initialized');
    return NextResponse.json({
      ok: true,
      uploadId: meta.uploadId,
      chunkBytes: GALLERY_CHUNK_BYTES,
      totalChunks: meta.totalChunks,
    });
  } catch (e) {
    logger.error({ event: 'gallery.upload.init.failed', err: e }, 'Gallery upload initialization failed');
    const message = e instanceof Error ? e.message : 'Init failed';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
  },
);
