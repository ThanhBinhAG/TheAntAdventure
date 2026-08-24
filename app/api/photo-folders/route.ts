import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  photoFolderCreateBodySchema,
} from '@/lib/gallery/gallery-list-input';
import {
  createPhotoFolder,
  GalleryRepositoryError,
  listPhotoFoldersServer,
} from '@/lib/gallery/photo-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const permission = await checkPermissionForRequest('gallery.read');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xem thư mục ảnh.',
      },
      { status: permission.status },
    );
  }

  try {
    const items = await listPhotoFoldersServer();
    return NextResponse.json(
      { ok: true, items },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Không thể lấy danh sách thư mục ảnh:', error);
    return NextResponse.json(
      { ok: false, error: 'Không thể tải danh sách thư mục.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const permission = await checkPermissionForRequest('gallery.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền tạo thư mục ảnh.',
      },
      { status: permission.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = photoFolderCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Dữ liệu thư mục không hợp lệ.' },
      { status: 422 },
    );
  }

  try {
    const folder = await createPhotoFolder(parsed.data);
    return NextResponse.json({ ok: true, folder });
  } catch (error) {
    if (error instanceof GalleryRepositoryError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: false, error: 'Không thể tạo thư mục.' },
      { status: 500 },
    );
  }
}
