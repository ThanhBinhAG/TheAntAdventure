import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { galleryPhotoPatchBodySchema } from '@/lib/gallery/gallery-list-input';
import {
  GalleryRepositoryError,
  updatePhoto,
} from '@/lib/gallery/photo-repository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('gallery.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền chỉnh sửa thư viện ảnh.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Thiếu photo id.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = galleryPhotoPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Dữ liệu cập nhật ảnh không hợp lệ.',
      },
      { status: 422 },
    );
  }

  if (
    parsed.data.caption === undefined &&
    parsed.data.region === undefined &&
    parsed.data.tags === undefined &&
    parsed.data.folderId === undefined
  ) {
    return NextResponse.json(
      { ok: false, error: 'Không có trường nào để cập nhật.' },
      { status: 422 },
    );
  }

  try {
    const photo = await updatePhoto(id, parsed.data);
    return NextResponse.json({ ok: true, photo });
  } catch (error) {
    if (error instanceof GalleryRepositoryError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'blocked' ? 409 : 500;
      return NextResponse.json({ ok: false, error: error.message }, { status });
    }
    return NextResponse.json(
      { ok: false, error: 'Không thể cập nhật ảnh.' },
      { status: 500 },
    );
  }
}
