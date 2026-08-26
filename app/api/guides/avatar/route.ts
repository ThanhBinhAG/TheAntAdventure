import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { getAuthContext } from '@/lib/auth/session';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { hasTrustedRequestOrigin } from '@/lib/auth/request-origin';
import { guideAvatarRequestSchema } from '@/lib/guides/guide-input';
import { uploadGuideAvatarServer } from '@/lib/guides/guide-avatar';
import { PHOTOS_BUCKET, guideAvatarPath } from '@/lib/storage/photo-paths';
import { ALLOWED_IMAGE_MIME } from '@/lib/storage/photo-limits';
import { getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';
import { getServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const avatarQuerySchema = z.object({ guideId: z.string().trim().min(1).max(64) });
const ALLOWED_MIME = new Set<string>(ALLOWED_IMAGE_MIME);

export const GET = bffRoute(
  { requiredPermission: 'guides.read', querySchema: avatarQuerySchema },
  async ({ supabase, query }) => {
    const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).download(guideAvatarPath(query.guideId));
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy avatar.' }, { status: 404 });
    }
    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'image/webp',
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  },
);

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'Origin không hợp lệ.' }, { status: 403 });
  }
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json(
      { ok: false, error: auth.authenticationUnavailable ? 'Dịch vụ xác thực tạm thời không khả dụng.' : 'Unauthorized' },
      {
        status: auth.authenticationUnavailable ? 503 : 401,
        headers: auth.authenticationUnavailable ? { 'Retry-After': '30' } : undefined,
      },
    );
  }
  const permission = await checkPermissionForRequest('guides.write', {
    auth,
    getSupabaseClient: () => getServerSupabaseClient(auth),
  });
  if (!permission.allowed) {
    return NextResponse.json(
      { ok: false, error: permission.status === 401 ? 'Unauthorized' : 'Forbidden' },
      { status: permission.status },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Multipart body không hợp lệ.' }, { status: 400 });
  }
  const parsed = guideAvatarRequestSchema.safeParse({ guideId: form.get('guideId') });
  const file = form.get('file');
  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Thiếu avatar hoặc mã hướng dẫn viên không hợp lệ.' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, error: 'Chỉ hỗ trợ JPEG, PNG và WebP.' }, { status: 400 });
  }

  const supabase = await getPhotoStorageClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Photo storage chưa được cấu hình.' }, { status: 503 });
  }
  try {
    const photo = await uploadGuideAvatarServer(supabase, parsed.data.guideId, file);
    return NextResponse.json({ ok: true, photo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải avatar lên.';
    const status = message === 'Guide not found.' ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
