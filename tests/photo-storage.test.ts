import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { photoToRow, rowToPhoto } from '../lib/db/mappers';
import {
  formatBytes,
  isStoragePhoto,
  photoDisplayUrl,
  photosForProductSlots,
  photoThumbUrl,
  productPhotoSlotStatus,
} from '../lib/gallery-helpers';
import { isNextImageOptimizable } from '../lib/storage-image-src';
import { matchProductCode, parseBulkFileName } from '../lib/gallery-bulk-upload';
import {
  galleryDeleteCandidatePaths,
  galleryDisplayPath,
  galleryStoragePaths,
  galleryThumbPath,
  thumbPathFromDisplayPath,
} from '../lib/storage/photo-paths';
import { galleryImageFileSchema } from '../lib/storage/photo-variants';
import { resolvePackageDayPhotos, resolveProductPhotos } from '../lib/tour-photos';
import type { Product } from '../lib/types';

describe('photo-paths', () => {
  it('builds loose gallery storage paths by default', () => {
    assert.equal(galleryDisplayPath('PH-001'), 'gallery/loose/PH-001/display.webp');
    assert.equal(galleryThumbPath('PH-001'), 'gallery/loose/PH-001/thumb.webp');
    assert.deepEqual(galleryStoragePaths('PH-001'), [
      'gallery/loose/PH-001/display.webp',
      'gallery/loose/PH-001/thumb.webp',
    ]);
  });

  it('builds owner-grouped paths', () => {
    assert.equal(
      galleryDisplayPath('PH-001', { kind: 'tour', tourCode: 'AA-NV-HAN-HD-01' }),
      'gallery/tours/AA-NV-HAN-HD-01/PH-001/display.webp'
    );
    assert.equal(
      galleryThumbPath('PH-001', { kind: 'attraction', attractionId: 'ATT-N-001' }),
      'gallery/attractions/ATT-N-001/PH-001/thumb.webp'
    );
    assert.deepEqual(galleryStoragePaths('PH-001', { kind: 'loose' }), [
      'gallery/loose/PH-001/display.webp',
      'gallery/loose/PH-001/thumb.webp',
    ]);
  });

  it('keeps legacy delete fallback', () => {
    assert.deepEqual(galleryDeleteCandidatePaths('PH-001', { kind: 'loose' }), [
      'gallery/loose/PH-001/display.webp',
      'gallery/loose/PH-001/thumb.webp',
      'gallery/PH-001/display.webp',
      'gallery/PH-001/thumb.webp',
    ]);
  });

  it('derives thumb path from display path', () => {
    assert.equal(thumbPathFromDisplayPath('gallery/PH-001/display.webp'), 'gallery/PH-001/thumb.webp');
    assert.equal(
      thumbPathFromDisplayPath('gallery/tours/AA-NV-HAN-HD-01/PH-001/display.webp'),
      'gallery/tours/AA-NV-HAN-HD-01/PH-001/thumb.webp'
    );
  });
});

describe('photo mappers', () => {
  it('round-trips thumb_url, storage_path, slot, display_bytes', () => {
    const app = {
      id: 'PH-001',
      caption: 'Test',
      region: 'north',
      product: 'AA-NV-HAN-HD-01',
      slot: 1 as const,
      url: 'https://proj.supabase.co/storage/v1/object/public/photos/gallery/PH-001/display.webp',
      thumbUrl: 'https://proj.supabase.co/storage/v1/object/public/photos/gallery/PH-001/thumb.webp',
      storagePath: 'gallery/PH-001/display.webp',
      displayBytes: 142000,
      tags: ['Cultural'],
    };
    const row = photoToRow(app);
    assert.equal(row.thumb_url, app.thumbUrl);
    assert.equal(row.storage_path, app.storagePath);
    assert.equal(row.slot, 1);
    assert.equal(row.display_bytes, 142000);
    const back = rowToPhoto(row, ['Cultural']);
    assert.equal(back.thumbUrl, app.thumbUrl);
    assert.equal(back.storagePath, app.storagePath);
    assert.equal(back.slot, 1);
    assert.equal(back.displayBytes, 142000);
  });
});

describe('gallery-helpers storage urls', () => {
  const storagePhoto = {
    id: 'PH-1',
    caption: 'Halong',
    region: 'north',
    url: 'https://abc.supabase.co/storage/v1/object/public/photos/gallery/PH-1/display.webp',
    thumbUrl: 'https://abc.supabase.co/storage/v1/object/public/photos/gallery/PH-1/thumb.webp',
    storagePath: 'gallery/PH-1/display.webp',
    displayBytes: 98000,
  };

  it('detects storage photos', () => {
    assert.equal(isStoragePhoto(storagePhoto), true);
    assert.equal(isStoragePhoto({ ...storagePhoto, storagePath: undefined, url: 'https://picsum.photos/x' }), false);
  });

  it('returns display and thumb urls', () => {
    assert.equal(photoDisplayUrl(storagePhoto), storagePhoto.url);
    assert.equal(photoThumbUrl(storagePhoto), storagePhoto.thumbUrl);
  });

  it('formats bytes', () => {
    assert.equal(formatBytes(500), '500 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(2 * 1024 * 1024), '2.0 MB');
    assert.equal(formatBytes(null), '—');
  });

  it('resolves explicit slots and pool', () => {
    const photos = [
      { id: 'a', caption: 'A', region: 'north', product: 'T1', slot: 1 as const, url: 'https://x/a' },
      { id: 'b', caption: 'B', region: 'north', product: 'T1', slot: 2 as const, url: 'https://x/b' },
      { id: 'c', caption: 'C', region: 'north', product: 'T1', url: 'https://x/c' },
    ];
    const slots = photosForProductSlots(photos, 'T1');
    assert.equal(slots.slot1?.id, 'a');
    assert.equal(slots.slot2?.id, 'b');
    assert.equal(slots.pool.length, 1);
    assert.equal(slots.pool[0]?.id, 'c');
    const status = productPhotoSlotStatus(photos, 'T1');
    assert.equal(status.complete, true);
    assert.equal(status.linked, 2);
  });
});

describe('storage-image-src', () => {
  it('allows self-hosted supabase storage host from env', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.mitelai.com:9001';
    try {
      assert.equal(
        isNextImageOptimizable('https://sb.mitelai.com:9001/storage/v1/object/public/photos/gallery/PH-015/thumb.webp'),
        true
      );
    } finally {
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
  });

  it('allows cloud supabase host', () => {
    assert.equal(
      isNextImageOptimizable('https://abc.supabase.co/storage/v1/object/public/photos/gallery/PH-1/thumb.webp'),
      true
    );
  });
});

describe('gallery-bulk-upload parser', () => {
  const codes = ['AA-NV-HAN-HD-01', 'AA-NV-HAN-HD-02'];

  it('parses slot filenames', () => {
    const p1 = parseBulkFileName('AA-NV-HAN-HD-01_1.jpg', codes);
    assert.equal(p1.status, 'ok');
    assert.equal(p1.productCode, 'AA-NV-HAN-HD-01');
    assert.equal(p1.slot, 1);

    const p2 = parseBulkFileName('AA-NV-HAN-HD-01_2.webp', codes);
    assert.equal(p2.slot, 2);

    const p3 = parseBulkFileName('AA-NV-HAN-HD-01_3.png', codes);
    assert.equal(p3.slot, null);
    assert.equal(p3.poolIndex, 3);
  });

  it('matches longest product code prefix', () => {
    assert.equal(matchProductCode('AA-NV-HAN-HD-01', codes), 'AA-NV-HAN-HD-01');
    assert.equal(matchProductCode('UNKNOWN_1', codes), null);
  });
});

describe('galleryImageFileSchema', () => {
  it('rejects oversized files', () => {
    const big = { type: 'image/jpeg', size: 11 * 1024 * 1024 } as File;
    assert.throws(() => galleryImageFileSchema.parse(big));
  });
});

describe('resolvePackageDayPhotos', () => {
  it('prefers gallery photos in package region', () => {
    const photos = resolvePackageDayPhotos(
      'Arrival in Hanoi',
      'north',
      'La Siesta Classic Ma May, Hanoi',
      [
        {
          id: 'PH-1',
          caption: 'Hanoi Old Quarter morning',
          region: 'north',
          url: 'https://abc.supabase.co/storage/v1/object/public/photos/gallery/PH-1/display.webp',
          thumbUrl: 'https://abc.supabase.co/storage/v1/object/public/photos/gallery/PH-1/thumb.webp',
        },
      ],
      1,
      1
    );
    assert.equal(photos[0]?.url?.includes('supabase.co'), true);
  });
});

describe('resolveProductPhotos', () => {
  const product = {
    code: 'AA-NV-HAN-HD-01',
    name: 'Hanoi tour',
    dest: 'Hanoi',
    region: 'north',
  } as Product;

  it('prefers slot 1 and 2 over pool order', () => {
    const resolved = resolveProductPhotos(
      product,
      [
        { id: 'pool', caption: 'Pool', region: 'north', product: product.code, url: 'https://x/pool' },
        { id: 's2', caption: 'Two', region: 'north', product: product.code, slot: 2, url: 'https://x/2' },
        { id: 's1', caption: 'One', region: 'north', product: product.code, slot: 1, url: 'https://x/1' },
      ],
      2
    );
    assert.equal(resolved[0]?.photoId, 's1');
    assert.equal(resolved[1]?.photoId, 's2');
  });
});
