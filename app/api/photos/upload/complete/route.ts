import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { sniffImageMimeFromFile } from '@/lib/image-pipeline/mime';
import {
  assertGalleryUploadComplete,
  cleanupGalleryUploadSession,
  deleteGalleryUploadOriginal,
  getGalleryUploadSession,
} from '@/lib/image-pipeline/upload-session';
import {
  getPhotoStorageClient,
  persistGalleryPhotoRow,
  processGalleryPhotoFromPath,
  uploadGalleryPhotoFromProcessed,
} from '@/lib/storage/upload-gallery-photo-server';
import {
  galleryPhotoMetaSchema,
  processingErrorStatus,
} from '@/lib/storage/gallery-upload-meta';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const maxDuration = 300;

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'gallery/upload/complete', route: '/api/photos/upload/complete' },
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

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: 'Photo storage is not configured (Supabase URL / keys).' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const uploadId = typeof raw.uploadId === 'string' ? raw.uploadId : '';
  if (!uploadId) {
    return NextResponse.json({ ok: false, error: 'Missing uploadId' }, { status: 400 });
  }

  const metaParsed = galleryPhotoMetaSchema.safeParse({
    photoId: raw.photoId,
    caption: raw.caption,
    region: raw.region,
    tags: raw.tags,
    folderId: raw.folderId,
  });
  if (!metaParsed.success) {
    return NextResponse.json(
      { ok: false, error: metaParsed.error.issues[0]?.message ?? 'Invalid metadata' },
      { status: 400 }
    );
  }

  const userId = auth.userId ?? auth.email ?? 'authenticated';

  try {
    const { meta, filePath, workDir } = await getGalleryUploadSession(uploadId, userId);
    await assertGalleryUploadComplete(meta);

    if (meta.photoId !== metaParsed.data.photoId) {
      return NextResponse.json(
        { ok: false, error: 'photoId does not match upload session' },
        { status: 400 }
      );
    }

    const mime =
      (await sniffImageMimeFromFile(filePath, meta.fileName, meta.mime)) ?? meta.mime;

    const processed = await processGalleryPhotoFromPath(
      filePath,
      mime,
      meta.totalBytes,
      workDir
    );

    await deleteGalleryUploadOriginal(uploadId);

    const uploaded = await uploadGalleryPhotoFromProcessed(
      client,
      metaParsed.data.photoId,
      processed
    );
    const photo = await persistGalleryPhotoRow(client, metaParsed.data, uploaded);
    await cleanupGalleryUploadSession(uploadId);
    logger.info({ event: 'gallery.upload.completed' }, 'Gallery upload completed');
    return NextResponse.json({ ok: true, photo });
  } catch (e) {
    logger.error({ event: 'gallery.upload.complete.failed', err: e }, 'Gallery upload completion failed');
    const message = e instanceof Error ? e.message : 'Upload failed';
    try {
      await cleanupGalleryUploadSession(uploadId);
    } catch {
      /* ignore */
    }
    const status = /not found|expired|incomplete|mismatch/i.test(message)
      ? 400
      : processingErrorStatus(message);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
  },
);
