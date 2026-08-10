/** Shared input limits for gallery / logo / avatar image uploads. */

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** Chunk size for large gallery uploads (bytes). */
export const GALLERY_CHUNK_BYTES = 512 * 1024;

/**
 * Soft pixel ceiling passed to Sharp (tests may override lower).
 * Gallery accepts large files; peak RAM is controlled by child worker + VIPS disc.
 */
export const GALLERY_SERVER_MAX_INPUT_PIXELS = 1_000_000_000;

export const GALLERY_DISPLAY_MAX_EDGE = 1280;
export const GALLERY_THUMB_MAX_EDGE = 400;
export const GALLERY_DISPLAY_QUALITY = 82;
export const GALLERY_THUMB_QUALITY = 75;

/**
 * Concurrent Sharp child processes per Node instance. Gallery uploads use 1 to limit
 * RAM spikes on dev machines; measured peak is ~130 MB per worker (libvips streams on load).
 */
export const GALLERY_MAX_CONCURRENT_SHARP_WORKERS = 1;

/** Temp upload session TTL before orphan cleanup (ms). */
export const GALLERY_UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Max time for Sharp child worker (ms). */
export const GALLERY_SHARP_WORKER_TIMEOUT_MS = 240_000;

/**
 * Per-user upload quota (in-memory, single-instance). Replaces a hard per-file byte
 * cap as the DOS guard — large legitimate files still go through chunked + Sharp.
 */
export const GALLERY_UPLOADS_PER_HOUR_PER_USER = 100;
export const GALLERY_BYTES_PER_HOUR_PER_USER = 10_000_000_000;
