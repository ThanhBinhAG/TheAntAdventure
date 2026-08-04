/** Shared input limits for gallery / logo / avatar image uploads. */

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** Hard ceiling on raw upload size (DoS / OOM). Below this, Sharp compresses to WebP variants. */
export const MAX_INPUT_BYTES = 50 * 1024 * 1024;

export const MAX_INPUT_ERROR = 'Image must be 50 MB or smaller';
