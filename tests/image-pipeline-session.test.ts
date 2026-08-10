import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

type SessionMod = typeof import('../lib/image-pipeline/upload-session');

let mod: SessionMod;
const originalTmp = os.tmpdir();

before(async () => {
  const require = createRequire(import.meta.url);
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;

  const tmp = await fs.mkdtemp(path.join(originalTmp, 'taa-session-test-'));
  process.env.TMPDIR = tmp;
  mod = await import('../lib/image-pipeline/upload-session');
});

after(async () => {
  if (process.env.TMPDIR?.includes('taa-session-test')) {
    await fs.rm(process.env.TMPDIR, { recursive: true, force: true });
  }
});

describe('gallery upload session', () => {
  it('creates session and appends ordered chunks', async () => {
    const totalBytes = 11;
    const meta = await mod.createGalleryUploadSession({
      photoId: 'PH-001',
      mime: 'image/jpeg',
      fileName: 'test.jpg',
      totalBytes,
      userId: 'user-a',
    });

    assert.equal(meta.totalChunks, 1);
    assert.equal(meta.nextChunkIndex, 0);

    const chunk = Buffer.from('hello-jpeg!');
    const updated = await mod.appendGalleryUploadChunk(
      meta.uploadId,
      0,
      chunk,
      'user-a'
    );
    assert.equal(updated.bytesReceived, totalBytes);
    assert.equal(updated.nextChunkIndex, 1);

    await mod.assertGalleryUploadComplete(updated);

    const session = await mod.getGalleryUploadSession(meta.uploadId, 'user-a');
    const data = await fs.readFile(session.filePath);
    assert.equal(data.toString(), 'hello-jpeg!');
    assert.ok(await fs.stat(session.workDir));

    await mod.cleanupGalleryUploadSession(meta.uploadId);
  });

  it('rejects wrong chunk index', async () => {
    const meta = await mod.createGalleryUploadSession({
      photoId: 'PH-002',
      mime: 'image/png',
      fileName: 'a.png',
      totalBytes: 4,
      userId: 'user-b',
    });
    await assert.rejects(
      () => mod.appendGalleryUploadChunk(meta.uploadId, 1, Buffer.alloc(4), 'user-b'),
      /Unexpected chunk index/
    );
    await mod.cleanupGalleryUploadSession(meta.uploadId);
  });

  it('deleteGalleryUploadOriginal removes original.bin', async () => {
    const meta = await mod.createGalleryUploadSession({
      photoId: 'PH-003',
      mime: 'image/webp',
      fileName: 'w.webp',
      totalBytes: 3,
      userId: 'user-c',
    });
    await mod.appendGalleryUploadChunk(meta.uploadId, 0, Buffer.from('abc'), 'user-c');
    await mod.deleteGalleryUploadOriginal(meta.uploadId);
    const session = await mod.getGalleryUploadSession(meta.uploadId, 'user-c');
    await assert.rejects(() => fs.access(session.filePath));
    await mod.cleanupGalleryUploadSession(meta.uploadId);
  });
});

describe('mime sniff', () => {
  it('detects webp from fixture', async () => {
    const { sniffImageMimeFromFile } = await import('../lib/image-pipeline/mime');
    const webp = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#336699' },
    })
      .webp()
      .toBuffer();
    const filePath = path.join(process.env.TMPDIR!, 'sniff.webp');
    await fs.writeFile(filePath, webp);
    const mime = await sniffImageMimeFromFile(filePath, 'x.webp', '');
    assert.equal(mime, 'image/webp');
  });
});
