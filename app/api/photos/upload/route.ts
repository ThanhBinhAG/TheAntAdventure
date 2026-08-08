import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { getPhotoStorageClient, uploadGalleryPhotoServer } from '@/lib/storage/upload-gallery-photo-server';
import { UNSORTED_FOLDER_ID } from '@/lib/gallery/photo-folders';
import { ALLOWED_IMAGE_MIME, MAX_INPUT_BYTES, MAX_INPUT_ERROR } from '@/lib/storage/photo-limits';

const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);

const metaSchema = z.object({
  photoId: z.string().min(1).max(64),
  caption: z.string().max(500).optional().default(''),
  region: z.string().max(64).optional().default('north'),
  tags: z.array(z.string().max(80)).max(40).optional().default([]),
  folderId: z.string().min(1).max(64).optional().default(UNSORTED_FOLDER_ID),
});

export async function POST(request: Request) {
  const perm = await checkPermissionForRequest('gallery.write');
  if (!perm.allowed) {
    return NextResponse.json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: perm.status }
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: 'Photo storage is not configured (Supabase URL / keys).' },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid multipart body' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Missing file' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: 'Only JPEG, PNG, and WebP are supported' }, { status: 400 });
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json({ ok: false, error: MAX_INPUT_ERROR }, { status: 400 });
  }

  let tags: string[] = [];
  const rawTags = form.get('tags');
  if (typeof rawTags === 'string' && rawTags.trim()) {
    try {
      const parsed = JSON.parse(rawTags) as unknown;
      if (Array.isArray(parsed)) tags = parsed.map(String);
    } catch {
      tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }

  const meta = metaSchema.safeParse({
    photoId: String(form.get('photoId') ?? ''),
    caption: String(form.get('caption') ?? ''),
    region: String(form.get('region') ?? 'north'),
    tags,
    folderId: String(form.get('folderId') ?? UNSORTED_FOLDER_ID) || UNSORTED_FOLDER_ID,
  });
  if (!meta.success) {
    return NextResponse.json({ ok: false, error: meta.error.issues[0]?.message ?? 'Invalid metadata' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGalleryPhotoServer(client, meta.data.photoId, buffer, file.type);

    const row = {
      id: meta.data.photoId,
      caption: meta.data.caption,
      region: meta.data.region,
      url: uploaded.url,
      thumb_url: uploaded.thumbUrl,
      storage_path: uploaded.storagePath,
      display_bytes: uploaded.displayBytes,
      folder_id: meta.data.folderId,
    };

    const { error: upsertErr } = await client.from('photos').upsert(row, { onConflict: 'id' });
    if (upsertErr) {
      await client.storage.from('photos').remove([uploaded.storagePath, uploaded.storagePath.replace(/display\.webp$/, 'thumb.webp')]);
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    await client.from('photo_tags').delete().eq('photo_id', meta.data.photoId);
    if (meta.data.tags.length) {
      const { error: tagErr } = await client.from('photo_tags').insert(
        meta.data.tags.map((tag) => ({ photo_id: meta.data.photoId, tag }))
      );
      if (tagErr) {
        return NextResponse.json({ ok: false, error: tagErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      photo: {
        id: meta.data.photoId,
        caption: meta.data.caption,
        region: meta.data.region,
        tags: meta.data.tags,
        url: uploaded.url,
        thumbUrl: uploaded.thumbUrl,
        storagePath: uploaded.storagePath,
        displayBytes: uploaded.displayBytes,
        folderId: meta.data.folderId,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
