/**
 * Gallery Sharp worker — forked child so a libvips OOM cannot kill Next.js.
 * Plain CommonJS (no @/ aliases). Parent sends one IPC job message.
 *
 * Env (set by parent before fork): VIPS_CONCURRENCY, VIPS_DISC_THRESHOLD
 */
'use strict';

process.env.VIPS_CONCURRENCY = process.env.VIPS_CONCURRENCY || '1';
process.env.VIPS_DISC_THRESHOLD = process.env.VIPS_DISC_THRESHOLD || '8m';

const fs = require('fs');
const sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(1);

const MIN_RECOMPRESS_QUALITY = 50;
const RECOMPRESS_QUALITY_STEP = 15;

/**
 * @param {{
 *   inputPath: string;
 *   limitInputPixels: number;
 *   variants: Array<{
 *     name: string;
 *     outPath: string;
 *     maxEdge: number | null;
 *     quality: number;
 *     maxBytes: number | null;
 *   }>;
 * }} job
 */
async function run(job) {
  const { inputPath, limitInputPixels, variants } = job;

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('No variants requested');
  }

  const results = [];
  let sourcePath = inputPath;
  let isFirst = true;

  for (const variant of variants) {
    const readOpts = {
      failOn: 'error',
      sequentialRead: true,
    };
    if (isFirst && limitInputPixels > 0) {
      readOpts.limitInputPixels = limitInputPixels;
    }

    let pipeline = sharp(sourcePath, readOpts);
    if (isFirst) {
      pipeline = pipeline.rotate();
    }
    if (variant.maxEdge) {
      pipeline = pipeline.resize({
        width: variant.maxEdge,
        height: variant.maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let info = await pipeline.webp({ quality: variant.quality }).toFile(variant.outPath);

    if (variant.maxBytes && info.size > variant.maxBytes) {
      const retryQuality = Math.max(
        variant.quality - RECOMPRESS_QUALITY_STEP,
        MIN_RECOMPRESS_QUALITY
      );
      if (retryQuality < variant.quality) {
        const tmpPath = `${variant.outPath}.recompress`;
        const retry = await sharp(variant.outPath, { failOn: 'error', sequentialRead: true })
          .webp({ quality: retryQuality })
          .toFile(tmpPath);
        if (retry.size < info.size) {
          fs.renameSync(tmpPath, variant.outPath);
          info = retry;
        } else {
          fs.rmSync(tmpPath, { force: true });
        }
      }
    }

    results.push({
      name: variant.name,
      bytes: info.size,
      width: info.width,
      height: info.height,
    });

    sourcePath = variant.outPath;
    isFirst = false;
  }

  return { ok: true, variants: results };
}

process.on('message', (msg) => {
  if (!msg || msg.type !== 'process') return;
  run(msg.job)
    .then((result) => {
      if (process.send) process.send(result);
      process.exit(0);
    })
    .catch((err) => {
      const message = err && err.message ? String(err.message) : 'Image processing failed';
      if (process.send) process.send({ ok: false, error: message });
      process.exit(1);
    });
});
