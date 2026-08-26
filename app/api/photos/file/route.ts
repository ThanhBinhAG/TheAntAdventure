import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { PHOTOS_BUCKET } from '@/lib/storage/photo-paths';

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
    querySchema: galleryAssetQuerySchema,
  },
  async ({ supabase, query }) => {
    const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).download(query.path);
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy ảnh.' }, { status: 404 });
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/webp',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  },
);
