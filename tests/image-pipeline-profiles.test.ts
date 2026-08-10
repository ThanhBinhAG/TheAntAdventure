import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GALLERY_SIZE_PROFILES,
  galleryVariantChain,
  pickGalleryProfile,
  type GalleryVariantName,
} from '../lib/image-pipeline/profiles';
import { GALLERY_DISPLAY_MAX_EDGE } from '../lib/image-pipeline/limits';

describe('GALLERY_SIZE_PROFILES', () => {
  it('each profile has display and thumb variants', () => {
    for (const profile of Object.values(GALLERY_SIZE_PROFILES)) {
      const names = profile.variants.map((v) => v.name).sort();
      assert.deepEqual(names, ['display', 'thumb']);
    }
  });

  it('display maxEdge matches shared limit', () => {
    for (const profile of Object.values(GALLERY_SIZE_PROFILES)) {
      const display = profile.variants.find((v) => v.name === 'display');
      assert.equal(display?.maxEdge, GALLERY_DISPLAY_MAX_EDGE, profile.name);
    }
  });
});

describe('pickGalleryProfile', () => {
  it('selects profile by source byte size', () => {
    assert.equal(pickGalleryProfile(1_000_000).name, 'small');
    assert.equal(pickGalleryProfile(10 * 1024 * 1024).name, 'standard');
    assert.equal(pickGalleryProfile(100 * 1024 * 1024).name, 'large');
  });
});

describe('galleryVariantChain', () => {
  it('orders variants largest-first', () => {
    const chain = galleryVariantChain(GALLERY_SIZE_PROFILES.standard);
    const names: GalleryVariantName[] = chain.map((v) => v.name);
    assert.deepEqual(names, ['display', 'thumb']);
    assert.ok((chain[0].maxEdge ?? 0) >= (chain[1].maxEdge ?? 0));
  });

  it('does not mutate profile variants', () => {
    const before = GALLERY_SIZE_PROFILES.standard.variants.map((v) => v.name);
    galleryVariantChain(GALLERY_SIZE_PROFILES.standard);
    assert.deepEqual(
      GALLERY_SIZE_PROFILES.standard.variants.map((v) => v.name),
      before
    );
  });
});
