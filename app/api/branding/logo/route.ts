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
import { ALLOWED_IMAGE_MIME } from '@/lib/storage/photo-limits';
import {
  getCachedCompanyLogo,
  invalidateCompanyLogoCache,
  setCachedCompanyLogo,
} from '@/lib/redis/branding-logo';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'branding/logo', route: '/api/branding/logo' },
  async (_request, _context, { logger }) => {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const cachedLogo = await getCachedCompanyLogo();

  if (cachedLogo !== undefined) {
    return json({ ok: true, logoUrl: cachedLogo });
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return json({ ok: true, logoUrl: null });
  }

  try {
    const logoUrl = await fetchCompanyLogoUrl(client);
    await setCachedCompanyLogo(logoUrl);

    return json({ ok: true, logoUrl });
  } catch (error) {
    logger.error({ event: 'branding.logo.load.failed', err: error }, 'Company logo load failed');
    // Table may not exist until migration is applied.
    return json({ ok: true, logoUrl: null });
  }
  },
);

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'branding/logo', route: '/api/branding/logo' },
  async (request, _context, { logger }) => {
  const perm = await checkPermissionForRequest('about.write');
  if (!perm.allowed) {
    logger.warn({ event: 'branding.permission.denied', statusCode: perm.status }, 'Branding permission denied');
    return json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      perm.status
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return json({ ok: false, error: 'Photo storage is not configured' }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid multipart body' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return json({ ok: false, error: 'Missing file' }, 400);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json({ ok: false, error: 'Only JPEG, PNG, and WebP are supported' }, 400);
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const webp = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: 512, height: 512, fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    const logoUrl = await uploadCompanyLogo(client, webp);
    await invalidateCompanyLogoCache();

    logger.info({ event: 'branding.logo.updated' }, 'Company logo updated');
    return json({ ok: true, logoUrl });
  } catch (e) {
    logger.error({ event: 'branding.logo.update.failed', err: e }, 'Company logo update failed');
    const raw = e instanceof Error ? e.message : 'Upload failed';
    const msg = /Input buffer|VipsJpeg|pngload|webp|unsupported|limit/i.test(raw)
      ? 'Could not process image. Try a smaller JPEG, PNG, or WebP file.'
      : raw;
    return json({ ok: false, error: msg }, 500);
  }
  },
);

export const DELETE = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'branding/logo', route: '/api/branding/logo' },
  async (_request, _context, { logger }) => {
  const perm = await checkPermissionForRequest('about.write');
  if (!perm.allowed) {
    logger.warn({ event: 'branding.permission.denied', statusCode: perm.status }, 'Branding permission denied');
    return json(
      { ok: false, error: perm.status === 401 ? 'Unauthorized' : 'Forbidden' },
      perm.status
    );
  }

  const client = await getPhotoStorageClient();
  if (!client) {
    return json({ ok: false, error: 'Photo storage is not configured' }, 503);
  }

  try {
    await clearCompanyLogo(client);
    await invalidateCompanyLogoCache();

    logger.info({ event: 'branding.logo.deleted' }, 'Company logo deleted');
    return json({ ok: true, logoUrl: null });
  } catch (e) {
    logger.error({ event: 'branding.logo.delete.failed', err: e }, 'Company logo deletion failed');
    const msg = e instanceof Error ? e.message : 'Reset failed';
    return json({ ok: false, error: msg }, 500);
  }
  },
);
