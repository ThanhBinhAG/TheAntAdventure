import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { deleteGalleryPhotoFilesServer, getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

const bodySchema = z.object({
  photoId: z.string().min(1).max(64),
  storagePath: z.string().max(500).optional().nullable(),
});

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'gallery/photos/delete', route: '/api/photos/delete' },
  async (request, _context, { logger }) => {
  const perm = await checkPermissionForRequest('gallery.write');
  if (!perm.allowed) {
    logger.warn({ event: 'gallery.permission.denied', statusCode: perm.status }, 'Gallery permission denied');
    return NextResponse.json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: perm.status }
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: 'Photo storage is not configured' }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  const { photoId, storagePath } = parsed.data;

  try {
    await deleteGalleryPhotoFilesServer(client, photoId, storagePath);

    await client.from('photo_tags').delete().eq('photo_id', photoId);
    const { error } = await client.from('photos').delete().eq('id', photoId);
    if (error) {
      logger.error({ event: 'gallery.photo.delete.failed', err: error }, 'Gallery photo deletion failed');
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    logger.info({ event: 'gallery.photo.deleted' }, 'Gallery photo deleted');
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ event: 'gallery.photo.delete.failed', err: e }, 'Gallery photo deletion failed');
    const message = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
  },
);
