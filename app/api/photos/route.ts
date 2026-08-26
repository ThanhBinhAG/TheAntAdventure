import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  galleryListQuerySchema,
  optionalGalleryQueryParam,
} from '@/lib/gallery/gallery-list-input';
import { listPhotosPage } from '@/lib/gallery/photo-repository';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'gallery/photos', route: '/api/photos' },
  async (request, _context, { logger }) => {
  const permission = await checkPermissionForRequest('gallery.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem thư viện ảnh.',
      },
      { status: permission.status },
    );
  }

  const url = new URL(request.url);
  const parsed = galleryListQuerySchema.safeParse({
    page: optionalGalleryQueryParam(url, 'page'),
    pageSize: optionalGalleryQueryParam(url, 'pageSize'),
    q: optionalGalleryQueryParam(url, 'q'),
    folderId: optionalGalleryQueryParam(url, 'folderId'),
    region: optionalGalleryQueryParam(url, 'region'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Thông tin phân trang hoặc tìm kiếm không hợp lệ.',
      },
      { status: 400 },
    );
  }

  try {
    const photoPage = await listPhotosPage(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        ...photoPage,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    logger.error({ event: 'gallery.photos.list.failed', err: error }, 'Photo list failed');

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải danh sách ảnh.',
      },
      { status: 500 },
    );
  }
  },
);
