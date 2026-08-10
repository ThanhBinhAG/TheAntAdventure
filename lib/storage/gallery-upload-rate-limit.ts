import 'server-only';
import {
  GALLERY_BYTES_PER_HOUR_PER_USER,
  GALLERY_UPLOADS_PER_HOUR_PER_USER,
} from '@/lib/storage/photo-limits';

/**
 * Per-user gallery upload quota (fixed 1h window, in-memory).
 * Single-instance only — document as a known gap if scaling to multiple Node processes.
 */

type Bucket = {
  count: number;
  bytes: number;
  windowStart: number;
};

const WINDOW_MS = 60 * 60 * 1000;

const buckets = new Map<string, Bucket>();

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

export type GalleryRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Checks the per-user hourly quota and, if within limits, records the attempt
 * (count + bytes) atomically. Call once per accepted init, with the upload's
 * `totalBytes` (original file size).
 */
export function checkAndRecordGalleryUploadRateLimit(
  userId: string,
  bytes: number
): GalleryRateLimitResult {
  const now = Date.now();
  prune(now);

  const key = userId || 'anonymous';
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { count: 0, bytes: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  if (
    bucket.count >= GALLERY_UPLOADS_PER_HOUR_PER_USER ||
    bucket.bytes + bytes > GALLERY_BYTES_PER_HOUR_PER_USER
  ) {
    const retryAfterSec = Math.max(Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000), 1);
    return { ok: false, retryAfterSec };
  }

  bucket.count += 1;
  bucket.bytes += bytes;
  return { ok: true };
}

/** Test-only: clear a bucket so tests don't bleed into each other. */
export function resetGalleryUploadRateLimit(userId: string): void {
  buckets.delete(userId || 'anonymous');
}
