import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { downloadPhotosBucketObject } from '@/lib/storage/photos-bucket-download';
import { resolveCompanyLogoStoragePath } from '@/lib/storage/upload-company-logo';
import { getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'branding/logo-file', route: '/api/branding/logo/file' },
  },
  async () => {
    const client = await getPhotoStorageClient();
    if (!client) {
      return NextResponse.json({ ok: false, error: 'Photo storage chưa được cấu hình.' }, { status: 503 });
    }

    const path = await resolveCompanyLogoStoragePath(client);
    if (!path) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy logo.' }, { status: 404 });
    }

    const downloaded = await downloadPhotosBucketObject(path, client);
    if (!downloaded) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy logo.' }, { status: 404 });
    }

    return new NextResponse(downloaded.data, {
      headers: {
        'Content-Type': downloaded.contentType || 'image/webp',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  },
);
