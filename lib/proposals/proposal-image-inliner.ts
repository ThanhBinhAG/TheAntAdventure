import 'server-only';

import {
  CRM_BRANDING_LOGO_FILE_ROUTE,
  CRM_GALLERY_FILE_ROUTE,
  isLegacyPhotosBucketPublicUrl,
  legacyPublicUrlToStoragePath,
} from '@/lib/gallery/gallery-asset-url';
import { downloadPhotosBucketObject } from '@/lib/storage/photos-bucket-download';
import { resolveCompanyLogoStoragePath } from '@/lib/storage/upload-company-logo';
import { getPhotoStorageClient } from '@/lib/storage/upload-gallery-photo-server';
import type { ProposalDoc } from './proposal-types';

async function blobToDataUrl(blob: Blob, contentType: string): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = contentType || blob.type || 'image/webp';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function galleryPathFromUrl(url: string): string | null {
  if (isLegacyPhotosBucketPublicUrl(url)) {
    return legacyPublicUrlToStoragePath(url);
  }

  try {
    const parsed = new URL(url, 'http://crm.local');
    if (!parsed.pathname.endsWith(CRM_GALLERY_FILE_ROUTE)) return null;
    return parsed.searchParams.get('path');
  } catch {
    if (!url.includes(`${CRM_GALLERY_FILE_ROUTE}?`)) return null;
    const query = url.slice(url.indexOf('?') + 1);
    return new URLSearchParams(query).get('path');
  }
}

function isBrandingLogoUrl(url: string): boolean {
  return url.includes(CRM_BRANDING_LOGO_FILE_ROUTE) || /\/branding\/logo/i.test(url);
}

async function inlineImageUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.endsWith('.svg')) return url;
  if (url.startsWith('http') && !url.includes('/api/photos/file') && !isBrandingLogoUrl(url) && !isLegacyPhotosBucketPublicUrl(url)) {
    return url;
  }

  const client = await getPhotoStorageClient();
  if (!client) return url;

  const galleryPath = galleryPathFromUrl(url);
  if (galleryPath) {
    const downloaded = await downloadPhotosBucketObject(galleryPath, client);
    if (downloaded) return blobToDataUrl(downloaded.data, downloaded.contentType);
  }

  if (isBrandingLogoUrl(url)) {
    const logoPath = await resolveCompanyLogoStoragePath(client);
    if (logoPath) {
      const downloaded = await downloadPhotosBucketObject(logoPath, client);
      if (downloaded) return blobToDataUrl(downloaded.data, downloaded.contentType);
    }
  }

  return url;
}

/** Replace CRM gallery/branding URLs with data URLs for headless PDF rendering. */
export async function inlineProposalDocImages(doc: ProposalDoc): Promise<ProposalDoc> {
  const logoUrl = await inlineImageUrl(doc.logoUrl);
  const days = await Promise.all(
    doc.days.map(async (day) => ({
      ...day,
      imageUrls: await Promise.all((day.imageUrls || []).map(inlineImageUrl)),
      segments: day.segments
        ? await Promise.all(
            day.segments.map(async (segment) => ({
              ...segment,
              imageUrls: await Promise.all((segment.imageUrls || []).map(inlineImageUrl)),
            })),
          )
        : day.segments,
    })),
  );

  return { ...doc, logoUrl, days };
}
