import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getAuthContext } from '@/lib/auth/session';
import { appendGalleryUploadChunkStream } from '@/lib/image-pipeline/upload-session';

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid multipart body' }, { status: 400 });
  }

  const uploadId = String(form.get('uploadId') ?? '');
  const chunkIndexRaw = String(form.get('chunkIndex') ?? '');
  const chunkIndex = Number(chunkIndexRaw);
  const chunk = form.get('chunk');

  if (!uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    return NextResponse.json({ ok: false, error: 'Missing uploadId or chunkIndex' }, { status: 400 });
  }
  if (!(chunk instanceof Blob)) {
    return NextResponse.json({ ok: false, error: 'Missing chunk' }, { status: 400 });
  }

  const userId = auth.userId ?? auth.email ?? 'authenticated';

  try {
    const webStream = chunk.stream();
    const nodeReadable = Readable.fromWeb(webStream as import('stream/web').ReadableStream);
    const meta = await appendGalleryUploadChunkStream(uploadId, chunkIndex, nodeReadable, userId);
    return NextResponse.json({
      ok: true,
      nextChunkIndex: meta.nextChunkIndex,
      bytesReceived: meta.bytesReceived,
      totalChunks: meta.totalChunks,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Chunk upload failed';
    const status = /not found|expired/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
