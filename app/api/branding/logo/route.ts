import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAuthContext } from '@/lib/auth/session';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  clearCompanyLogo,
  fetchCompanyLogoUrl,
  uploadCompanyLogo,
} from '@/lib/storage/upload-company-logo';
import { getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';
import { ALLOWED_IMAGE_MIME, MAX_INPUT_BYTES, MAX_INPUT_ERROR } from '@/lib/storage/photo-limits';

const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json({ ok: true, logoUrl: null });
  }

  try {
    const logoUrl = await fetchCompanyLogoUrl(client);
    return NextResponse.json({ ok: true, logoUrl });
  } catch {
    // Table may not exist until migration is applied.
    return NextResponse.json({ ok: true, logoUrl: null });
  }
}

export async function POST(request: Request) {
  const perm = await checkPermissionForRequest('about.write');
  if (!perm.allowed) {
    return NextResponse.json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: perm.status }
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: 'Photo storage is not configured' },
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

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: 512, height: 512, fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    const logoUrl = await uploadCompanyLogo(client, webp);
    return NextResponse.json({ ok: true, logoUrl });
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'Upload failed';
    const msg = /Input buffer|VipsJpeg|pngload|webp|unsupported|limit/i.test(raw)
      ? 'Could not process image. Try a smaller JPEG, PNG, or WebP file.'
      : raw;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const perm = await checkPermissionForRequest('about.write');
  if (!perm.allowed) {
    return NextResponse.json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: perm.status }
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: 'Photo storage is not configured' },
      { status: 503 }
    );
  }

  try {
    await clearCompanyLogo(client);
    return NextResponse.json({ ok: true, logoUrl: null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Reset failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
