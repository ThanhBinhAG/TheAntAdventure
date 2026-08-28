import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { downloadPhotosBucketObject } from '@/lib/storage/photos-bucket-download';

export const dynamic = 'force-dynamic';

const galleryAssetQuerySchema = z.object({
  path: z.string().regex(
    /^gallery\/[A-Za-z0-9_.-]+\/(display|thumb)\.webp$/,
    'Đường dẫn ảnh không hợp lệ.',
  ),
});

export const GET = bffRoute(
  {
    logging: { scope: 'gallery/photo-file', route: '/api/photos/file' },
    requiredPermission: 'gallery.read',
    querySchema: galleryAssetQuerySchema,
  },
  async ({ query }) => {
    const downloaded = await downloadPhotosBucketObject(query.path);
    if (!downloaded) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy ảnh.' }, { status: 404 });
    }

    return new NextResponse(downloaded.data, {
      headers: {
        'Content-Type': downloaded.contentType || 'image/webp',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  },
);
