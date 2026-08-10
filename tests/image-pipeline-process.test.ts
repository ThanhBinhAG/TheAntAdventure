import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  GALLERY_DISPLAY_MAX_EDGE,
  GALLERY_THUMB_MAX_EDGE,
} from '../lib/image-pipeline/limits';
import { GALLERY_SIZE_PROFILES } from '../lib/image-pipeline/profiles';

type ProcessMod = typeof import('../lib/image-pipeline/process');

let processGalleryAssetFromPath: ProcessMod['processGalleryAssetFromPath'];

before(async () => {
  const require = createRequire(import.meta.url);
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as NodeModule;

  ({ processGalleryAssetFromPath } = await import('../lib/image-pipeline/process'));
});

async function writeJpeg(filePath: string, width: number, height: number): Promise<void> {
  await sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } },
  })
    .jpeg()
    .toFile(filePath);
}

describe('processGalleryAssetFromPath', () => {
  it('produces display and thumb WebP within edge limits', async () => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taa-sharp-test-'));
    const filePath = path.join(workDir, 'input.jpg');
    await writeJpeg(filePath, 2000, 1500);

    const profile = GALLERY_SIZE_PROFILES.standard;
    const result = await processGalleryAssetFromPath(filePath, 'image/jpeg', profile, {
      workDir: path.join(workDir, 'out'),
    });

    assert.equal(result.profile, 'standard');
    const display = result.variants.find((v) => v.name === 'display');
    const thumb = result.variants.find((v) => v.name === 'thumb');
    assert.ok(display && thumb);
    assert.ok(display.width <= GALLERY_DISPLAY_MAX_EDGE);
    assert.ok(display.height <= GALLERY_DISPLAY_MAX_EDGE);
    assert.ok(thumb.width <= GALLERY_THUMB_MAX_EDGE);
    assert.ok(thumb.height <= GALLERY_THUMB_MAX_EDGE);

    const displayMeta = await sharp(display.buffer).metadata();
    assert.equal(displayMeta.format, 'webp');

    await fs.rm(workDir, { recursive: true, force: true });
  });

  it('rejects unsupported mime', async () => {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'taa-sharp-gif-'));
    const filePath = path.join(workDir, 'input.jpg');
    await writeJpeg(filePath, 100, 100);
    await assert.rejects(
      () =>
        processGalleryAssetFromPath(filePath, 'image/gif', GALLERY_SIZE_PROFILES.small, {
          workDir: path.join(workDir, 'out'),
        }),
      /Only JPEG, PNG, and WebP/
    );
    await fs.rm(workDir, { recursive: true, force: true });
  });
});
