import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { photoFolderPatchBodySchema } from '@/lib/gallery/gallery-list-input';
import {
  deletePhotoFolder,
  GalleryRepositoryError,
  updatePhotoFolder,
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
        error: 'Bạn không có quyền chỉnh sửa thư mục ảnh.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Thiếu folder id.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = photoFolderPatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Tên thư mục không hợp lệ.' },
      { status: 422 },
    );
  }

  try {
    const folder = await updatePhotoFolder(id, parsed.data);
    return NextResponse.json({ ok: true, folder });
  } catch (error) {
    if (error instanceof GalleryRepositoryError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'blocked' ? 409 : 500;
      return NextResponse.json({ ok: false, error: error.message }, { status });
    }
    return NextResponse.json(
      { ok: false, error: 'Không thể đổi tên thư mục.' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const permission = await checkPermissionForRequest('gallery.write');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Bạn không có quyền xóa thư mục ảnh.',
      },
      { status: permission.status },
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Thiếu folder id.' }, { status: 400 });
  }

  try {
    await deletePhotoFolder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GalleryRepositoryError) {
      const status = error.code === 'blocked' ? 409 : error.code === 'not_found' ? 404 : 500;
      return NextResponse.json({ ok: false, error: error.message }, { status });
    }
    return NextResponse.json(
      { ok: false, error: 'Không thể xóa thư mục.' },
      { status: 500 },
    );
  }
}
