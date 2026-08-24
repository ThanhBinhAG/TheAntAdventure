import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  galleryListQuerySchema,
  optionalGalleryQueryParam,
} from '@/lib/gallery/gallery-list-input';
import {
  GalleryRepositoryError,
  listPhotosPage,
} from '@/lib/gallery/photo-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    if (error instanceof GalleryRepositoryError) {
      console.error('Không thể lấy danh sách ảnh:', error.message);
    } else {
      console.error('Lỗi không xác định khi lấy danh sách ảnh:', error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Không thể tải danh sách ảnh.',
      },
      { status: 500 },
    );
  }
}
