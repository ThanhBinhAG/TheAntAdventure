import 'server-only';
import { randomUUID } from 'node:crypto';
import { createWriteStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import {
  ALLOWED_IMAGE_MIME,
  GALLERY_CHUNK_BYTES,
  GALLERY_UPLOAD_SESSION_TTL_MS,
  type AllowedImageMime,
} from '@/lib/image-pipeline/limits';

const ROOT = path.join(os.tmpdir(), 'taa-gallery-uploads');
const META_NAME = 'meta.json';
const DATA_NAME = 'original.bin';
const WORK_DIR_NAME = 'work';

export type GalleryUploadSessionMeta = {
  uploadId: string;
  photoId: string;
  mime: AllowedImageMime;
  fileName: string;
  totalBytes: number;
  totalChunks: number;
  nextChunkIndex: number;
  bytesReceived: number;
  createdAt: number;
  userId: string;
};

export type CreateGalleryUploadSessionInput = {
  photoId: string;
  mime: AllowedImageMime;
  fileName: string;
  totalBytes: number;
  userId: string;
};

function sessionDir(uploadId: string): string {
  return path.join(ROOT, uploadId);
}

function metaPath(uploadId: string): string {
  return path.join(sessionDir(uploadId), META_NAME);
}

function dataPath(uploadId: string): string {
  return path.join(sessionDir(uploadId), DATA_NAME);
}

function workDirPath(uploadId: string): string {
  return path.join(sessionDir(uploadId), WORK_DIR_NAME);
}

function assertSafeUploadId(uploadId: string): void {
  if (!/^[a-f0-9-]{36}$/i.test(uploadId)) {
    throw new Error('Invalid upload session id');
  }
}

async function readMeta(uploadId: string): Promise<GalleryUploadSessionMeta> {
  assertSafeUploadId(uploadId);
  const raw = await fs.readFile(metaPath(uploadId), 'utf8');
  return JSON.parse(raw) as GalleryUploadSessionMeta;
}

async function writeMeta(meta: GalleryUploadSessionMeta): Promise<void> {
  await fs.writeFile(metaPath(meta.uploadId), JSON.stringify(meta), 'utf8');
}

export async function cleanupGalleryUploadSession(uploadId: string): Promise<void> {
  try {
    assertSafeUploadId(uploadId);
    await fs.rm(sessionDir(uploadId), { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

/** Remove sessions older than TTL (called on init). */
export async function purgeExpiredGalleryUploadSessions(): Promise<void> {
  try {
    await fs.mkdir(ROOT, { recursive: true });
    const entries = await fs.readdir(ROOT, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(
      entries.map(async (ent) => {
        if (!ent.isDirectory()) return;
        const id = ent.name;
        try {
          assertSafeUploadId(id);
          const meta = await readMeta(id);
          if (now - meta.createdAt > GALLERY_UPLOAD_SESSION_TTL_MS) {
            await cleanupGalleryUploadSession(id);
          }
        } catch {
          try {
            const st = await fs.stat(sessionDir(id));
            if (now - st.mtimeMs > GALLERY_UPLOAD_SESSION_TTL_MS) {
              await cleanupGalleryUploadSession(id);
            }
          } catch {
            /* ignore */
          }
        }
      })
    );
  } catch {
    /* ignore purge failures */
  }
}

export async function createGalleryUploadSession(
  input: CreateGalleryUploadSessionInput
): Promise<GalleryUploadSessionMeta> {
  if (!ALLOWED_IMAGE_MIME.includes(input.mime)) {
    throw new Error('Only JPEG, PNG, and WebP are supported');
  }
  if (!Number.isFinite(input.totalBytes) || input.totalBytes <= 0) {
    throw new Error('Invalid file size');
  }
  if (!input.photoId.trim()) throw new Error('Missing photoId');

  await purgeExpiredGalleryUploadSessions();

  const uploadId = randomUUID();
  const totalChunks = Math.ceil(input.totalBytes / GALLERY_CHUNK_BYTES);
  const meta: GalleryUploadSessionMeta = {
    uploadId,
    photoId: input.photoId.trim(),
    mime: input.mime,
    fileName: input.fileName || 'photo',
    totalBytes: input.totalBytes,
    totalChunks,
    nextChunkIndex: 0,
    bytesReceived: 0,
    createdAt: Date.now(),
    userId: input.userId,
  };

  const dir = sessionDir(uploadId);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(workDirPath(uploadId), { recursive: true });
  await writeMeta(meta);
  await fs.writeFile(dataPath(uploadId), Buffer.alloc(0));
  return meta;
}

function expectedChunkLength(meta: GalleryUploadSessionMeta, chunkIndex: number): number {
  const isLast = chunkIndex === meta.totalChunks - 1;
  return isLast ? meta.totalBytes - meta.bytesReceived : GALLERY_CHUNK_BYTES;
}

async function validateChunkRequest(
  uploadId: string,
  chunkIndex: number,
  userId: string
): Promise<GalleryUploadSessionMeta> {
  const meta = await readMeta(uploadId);
  if (meta.userId !== userId) throw new Error('Upload session not found');
  if (Date.now() - meta.createdAt > GALLERY_UPLOAD_SESSION_TTL_MS) {
    await cleanupGalleryUploadSession(uploadId);
    throw new Error('Upload session expired. Start the upload again.');
  }
  if (chunkIndex !== meta.nextChunkIndex) {
    throw new Error(`Unexpected chunk index ${chunkIndex}; expected ${meta.nextChunkIndex}`);
  }
  if (chunkIndex < 0 || chunkIndex >= meta.totalChunks) {
    throw new Error('Chunk index out of range');
  }
  return meta;
}

export async function appendGalleryUploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Buffer,
  userId: string
): Promise<GalleryUploadSessionMeta> {
  const meta = await validateChunkRequest(uploadId, chunkIndex, userId);
  const expectedLen = expectedChunkLength(meta, chunkIndex);
  if (chunk.length !== expectedLen) {
    const isLast = chunkIndex === meta.totalChunks - 1;
    throw new Error(
      isLast
        ? `Final chunk size mismatch (got ${chunk.length}, expected ${expectedLen})`
        : `Chunk size must be ${GALLERY_CHUNK_BYTES} bytes (got ${chunk.length})`
    );
  }

  await fs.appendFile(dataPath(uploadId), chunk);
  meta.nextChunkIndex += 1;
  meta.bytesReceived += chunk.length;
  await writeMeta(meta);
  return meta;
}

/** Stream a chunk body to disk without buffering the whole file in Node heap. */
export async function appendGalleryUploadChunkStream(
  uploadId: string,
  chunkIndex: number,
  stream: Readable,
  userId: string
): Promise<GalleryUploadSessionMeta> {
  const meta = await validateChunkRequest(uploadId, chunkIndex, userId);
  const expectedLen = expectedChunkLength(meta, chunkIndex);

  const out = createWriteStream(dataPath(uploadId), { flags: 'a' });
  await pipeline(stream, out);

  const stat = await fs.stat(dataPath(uploadId));
  const receivedThisChunk = stat.size - meta.bytesReceived;
  if (receivedThisChunk !== expectedLen) {
    throw new Error(
      chunkIndex === meta.totalChunks - 1
        ? `Final chunk size mismatch (got ${receivedThisChunk}, expected ${expectedLen})`
        : `Chunk size must be ${GALLERY_CHUNK_BYTES} bytes (got ${receivedThisChunk})`
    );
  }

  meta.nextChunkIndex += 1;
  meta.bytesReceived = stat.size;
  await writeMeta(meta);
  return meta;
}

export async function getGalleryUploadSession(
  uploadId: string,
  userId: string
): Promise<{ meta: GalleryUploadSessionMeta; filePath: string; workDir: string; dir: string }> {
  const meta = await readMeta(uploadId);
  if (meta.userId !== userId) throw new Error('Upload session not found');
  if (Date.now() - meta.createdAt > GALLERY_UPLOAD_SESSION_TTL_MS) {
    await cleanupGalleryUploadSession(uploadId);
    throw new Error('Upload session expired. Start the upload again.');
  }
  return {
    meta,
    filePath: dataPath(uploadId),
    workDir: workDirPath(uploadId),
    dir: sessionDir(uploadId),
  };
}

export async function assertGalleryUploadComplete(meta: GalleryUploadSessionMeta): Promise<void> {
  if (meta.nextChunkIndex !== meta.totalChunks) {
    throw new Error(`Upload incomplete: received ${meta.nextChunkIndex}/${meta.totalChunks} chunks`);
  }
  if (meta.bytesReceived !== meta.totalBytes) {
    throw new Error(
      `Upload size mismatch: received ${meta.bytesReceived} bytes, expected ${meta.totalBytes}`
    );
  }
}

/** Drop the assembled original immediately after Sharp succeeds — frees disk before Storage I/O. */
export async function deleteGalleryUploadOriginal(uploadId: string): Promise<void> {
  try {
    assertSafeUploadId(uploadId);
    await fs.unlink(dataPath(uploadId));
  } catch {
    /* best-effort */
  }
}
