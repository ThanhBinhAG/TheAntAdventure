import 'server-only';
import { fork, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sharpWorkerGate } from '@/lib/image-pipeline/concurrency';
import {
  galleryVariantChain,
  type GallerySizeProfile,
  type GalleryVariantName,
} from '@/lib/image-pipeline/profiles';
import {
  ALLOWED_IMAGE_MIME,
  GALLERY_SERVER_MAX_INPUT_PIXELS,
  GALLERY_SHARP_WORKER_TIMEOUT_MS,
} from '@/lib/image-pipeline/limits';

const WORKER_PATH = path.join(process.cwd(), 'lib/image-pipeline/sharp-worker.cjs');

const PIXEL_LIMIT_RE = /input image exceeds pixel limit|limitInputPixels|too many pixels/i;

export type GalleryProcessedVariant = {
  name: GalleryVariantName;
  buffer: Buffer;
  bytes: number;
  width: number;
  height: number;
};

export type GalleryProcessedAsset = {
  profile: GallerySizeProfile['name'];
  variants: GalleryProcessedVariant[];
  /** Wall time spent inside the Sharp worker (ms), excluding queue wait. */
  processingMs: number;
};

function mapSharpError(raw: string): Error {
  if (PIXEL_LIMIT_RE.test(raw)) {
    return new Error(
      'Image resolution is too large to process safely. Compress or resize it before uploading.'
    );
  }
  if (/Input buffer|VipsJpeg|pngload|webp|unsupported|limit|memory|Allocation failed/i.test(raw)) {
    return new Error('Could not process image safely. Try another JPEG, PNG, or WebP file.');
  }
  return new Error(raw);
}

type WorkerVariantResult = { name: string; bytes: number; width: number; height: number };

type WorkerResult =
  | { ok: true; variants: WorkerVariantResult[] }
  | { ok: false; error: string };

type WorkerJob = {
  inputPath: string;
  limitInputPixels: number;
  variants: Array<{
    name: GalleryVariantName;
    outPath: string;
    maxEdge: number | null;
    quality: number;
    maxBytes: number | null;
  }>;
};

function runSharpWorker(job: WorkerJob): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child: ChildProcess = fork(WORKER_PATH, [], {
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      env: {
        ...process.env,
        VIPS_CONCURRENCY: '1',
        VIPS_DISC_THRESHOLD: '8m',
      },
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      reject(new Error('Image processing timed out. Try a smaller file or retry later.'));
    }, GALLERY_SHARP_WORKER_TIMEOUT_MS);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    let gotMessage = false;
    child.on('message', (msg: unknown) => {
      gotMessage = true;
      finish(() => resolve(msg as WorkerResult));
    });

    child.on('error', (err) => {
      finish(() => reject(err));
    });

    child.on('exit', (code, signal) => {
      finish(() => {
        if (gotMessage) return;
        if (signal === 'SIGKILL' || signal === 'SIGTERM' || (code !== 0 && code !== null)) {
          reject(
            new Error(
              'Image too heavy for this machine to process safely. Try a smaller JPEG/PNG/WebP.'
            )
          );
          return;
        }
        reject(new Error('Image processing worker exited without a result.'));
      });
    });

    child.send({ type: 'process', job });
  });
}

export type ProcessGalleryAssetOptions = {
  /** Directory for intermediate WebP files; created if missing. */
  workDir?: string;
  /** Override the soft pixel ceiling (tests only). */
  maxInputPixels?: number;
};

/**
 * Disk → Sharp child → disk → read the small WebP buffers back.
 * Isolates native OOM from the Next.js process and bounds concurrency via `sharpWorkerGate`.
 */
export async function processGalleryAssetFromPath(
  filePath: string,
  mime: string,
  profile: GallerySizeProfile,
  opts?: ProcessGalleryAssetOptions
): Promise<GalleryProcessedAsset> {
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) {
    throw new Error('Only JPEG, PNG, and WebP are supported');
  }
  if (!filePath.trim()) throw new Error('Missing image path');

  const workDir = opts?.workDir ?? path.join(os.tmpdir(), `taa-gallery-sharp-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  const chain = galleryVariantChain(profile);
  const job: WorkerJob = {
    inputPath: filePath,
    limitInputPixels: opts?.maxInputPixels ?? GALLERY_SERVER_MAX_INPUT_PIXELS,
    variants: chain.map((v) => ({
      name: v.name,
      outPath: path.join(workDir, `${v.name}.webp`),
      maxEdge: v.maxEdge,
      quality: v.quality,
      maxBytes: v.maxBytes,
    })),
  };

  const startedAt = Date.now();
  try {
    const result = await sharpWorkerGate.run(() => runSharpWorker(job));
    if (!result.ok) {
      throw mapSharpError(result.error || 'Image processing failed');
    }

    const byName = new Map(result.variants.map((v) => [v.name, v]));
    const variants = await Promise.all(
      job.variants.map(async (spec) => {
        const info = byName.get(spec.name);
        if (!info) throw new Error(`Worker did not produce the ${spec.name} variant`);
        const buffer = await fs.readFile(spec.outPath);
        return {
          name: spec.name,
          buffer,
          bytes: buffer.byteLength || info.bytes,
          width: info.width,
          height: info.height,
        } satisfies GalleryProcessedVariant;
      })
    );

    return { profile: profile.name, variants, processingMs: Date.now() - startedAt };
  } catch (e) {
    if (e instanceof Error && /too heavy|timed out|too large to process/i.test(e.message)) {
      throw e;
    }
    const raw = e instanceof Error ? e.message : 'Image processing failed';
    throw mapSharpError(raw);
  } finally {
    if (!opts?.workDir) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
