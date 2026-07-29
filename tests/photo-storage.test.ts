import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { photoToRow, rowToPhoto, productPhotoRows, assembleProducts } from '../lib/db/mappers';
import {
  formatBytes,
  isStoragePhoto,
  photoDisplayUrl,
  photosForProductSlots,
  photoThumbUrl,
  productPhotoSlotStatus,
} from '../lib/gallery/gallery-helpers';
import { isNextImageOptimizable } from '../lib/gallery/storage-image-src';
import {
  galleryDeleteCandidatePaths,
  galleryDisplayPath,
  galleryStoragePaths,
  galleryThumbPath,
  thumbPathFromDisplayPath,
} from '../lib/storage/photo-paths';
import { galleryImageFileSchema } from '../lib/storage/photo-variants';
import { resolvePackageDayPhotos, resolveProductPhotos } from '../lib/gallery/tour-photos';
import type { Product } from '../lib/types';

describe('photo-paths', () => {
  it('builds flat gallery storage paths', () => {
    assert.equal(galleryDisplayPath('PH-001'), 'gallery/PH-001/display.webp');
    assert.equal(galleryThumbPath('PH-001'), 'gallery/PH-001/thumb.webp');
    assert.deepEqual(galleryStoragePaths('PH-001'), [
      'gallery/PH-001/display.webp',
      'gallery/PH-001/thumb.webp',
    ]);
  });

  it('includes stored path in delete candidates', () => {
    assert.deepEqual(galleryDeleteCandidatePaths('PH-001', 'gallery/tours/X/PH-001/display.webp'), [
      'gallery/PH-001/display.webp',
      'gallery/PH-001/thumb.webp',
      'gallery/tours/X/PH-001/display.webp',
      'gallery/tours/X/PH-001/thumb.webp',
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
  it('round-trips thumb_url, storage_path, display_bytes (no product/slot)', () => {
    const app = {
      id: 'PH-001',
      caption: 'Test',
      region: 'north',
      url: 'https://proj.supabase.co/storage/v1/object/public/photos/gallery/PH-001/display.webp',
      thumbUrl: 'https://proj.supabase.co/storage/v1/object/public/photos/gallery/PH-001/thumb.webp',
      storagePath: 'gallery/PH-001/display.webp',
      displayBytes: 142000,
      tags: ['Cultural'],
    };
    const row = photoToRow(app);
    assert.equal(row.thumb_url, app.thumbUrl);
    assert.equal(row.storage_path, app.storagePath);
    assert.equal(row.product_code, undefined);
    assert.equal(row.slot, undefined);
    assert.equal(row.display_bytes, 142000);
    const back = rowToPhoto(row, ['Cultural']);
    assert.equal(back.thumbUrl, app.thumbUrl);
    assert.equal(back.storagePath, app.storagePath);
    assert.equal(back.displayBytes, 142000);
    assert.equal(back.product, undefined);
  });

  it('builds product_photos junction rows from featured + pool', () => {
    const rows = productPhotoRows({
      code: 'AA-1',
      photoIds: ['PH-1', 'PH-2'],
      linkedPhotoIds: ['PH-1', 'PH-2', 'PH-3'],
    });
    assert.equal(rows.length, 3);
    assert.equal(rows.filter((r) => r.is_featured).length, 2);
    assert.equal(rows.find((r) => r.photo_id === 'PH-3')?.is_featured, false);
  });

  it('assembles products with photo links', () => {
    const products = assembleProducts(
      [{ code: 'AA-1', name: 'Tour', logic: '', duration: '', category: '', destination: '', level: '', description: '', usp: '', notes_to_sales: '', price_from: '', region: 'north' }],
      [
        { product_code: 'AA-1', photo_id: 'PH-1', sort_order: 0, is_featured: true },
        { product_code: 'AA-1', photo_id: 'PH-2', sort_order: 1, is_featured: false },
      ]
    );
    assert.deepEqual(products[0]?.photoIds, ['PH-1']);
    assert.deepEqual(products[0]?.linkedPhotoIds, ['PH-1', 'PH-2']);
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

  it('resolves featured slots and pool from product links', () => {
    const photos = [
      { id: 'a', caption: 'A', region: 'north', url: 'https://x/a' },
      { id: 'b', caption: 'B', region: 'north', url: 'https://x/b' },
      { id: 'c', caption: 'C', region: 'north', url: 'https://x/c' },
    ];
    const product = {
      photoIds: ['a', 'b'],
      linkedPhotoIds: ['a', 'b', 'c'],
    };
    const slots = photosForProductSlots(photos, product);
    assert.equal(slots.slot1?.id, 'a');
    assert.equal(slots.slot2?.id, 'b');
    assert.equal(slots.pool.length, 1);
    assert.equal(slots.pool[0]?.id, 'c');
    const status = productPhotoSlotStatus(product);
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
    photoIds: ['s1', 's2'],
    linkedPhotoIds: ['s1', 's2', 'pool'],
  } as Product;

  it('prefers featured photoIds over pool order', () => {
    const resolved = resolveProductPhotos(
      product,
      [
        { id: 'pool', caption: 'Pool', region: 'north', url: 'https://x/pool' },
        { id: 's2', caption: 'Two', region: 'north', url: 'https://x/2' },
        { id: 's1', caption: 'One', region: 'north', url: 'https://x/1' },
      ],
      2
    );
    assert.equal(resolved[0]?.photoId, 's1');
    assert.equal(resolved[1]?.photoId, 's2');
  });
});
