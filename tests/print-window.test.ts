import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { waitForImages } from '../lib/core/print-window';

describe('print-window', () => {
  it('waitForImages resolves immediately when no images', async () => {
    const doc = { images: [] as HTMLImageElement[] } as unknown as Document;
    await assert.doesNotReject(() => waitForImages(doc));
  });

  it('waitForImages resolves when all images are complete', async () => {
    const img = { complete: true, addEventListener: () => {} } as unknown as HTMLImageElement;
    const doc = { images: [img] } as unknown as Document;
    await assert.doesNotReject(() => waitForImages(doc));
  });
});
