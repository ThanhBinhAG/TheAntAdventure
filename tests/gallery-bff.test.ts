import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  GALLERY_PAGE_SIZES,
  galleryListQuerySchema,
  galleryPhotoPatchBodySchema,
  photoFolderCreateBodySchema,
  photoFolderPatchBodySchema,
} from '@/lib/gallery/gallery-list-input';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('gallery list query accepts page/pageSize/q/folderId/region', () => {
  const parsed = galleryListQuerySchema.safeParse({
    page: '2',
    pageSize: '24',
    q: 'halong',
    folderId: 'PF-001',
    region: 'north',
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.pageSize, 24);
  assert.equal(parsed.data.q, 'halong');
  assert.ok((GALLERY_PAGE_SIZES as readonly number[]).includes(parsed.data.pageSize));
});

test('gallery photo patch accepts partial metadata', () => {
  const ok = galleryPhotoPatchBodySchema.safeParse({
    caption: 'Sunset',
    tags: ['landscape'],
    folderId: 'PF-002',
  });
  assert.equal(ok.success, true);

  const bad = galleryPhotoPatchBodySchema.safeParse({ caption: '' });
  assert.equal(bad.success, false);
});

test('photo folder create/patch bodies validate name', () => {
  const create = photoFolderCreateBodySchema.safeParse({
    name: 'Vietnam',
    parentId: null,
  });
  assert.equal(create.success, true);

  const patch = photoFolderPatchBodySchema.safeParse({ name: 'Renamed' });
  assert.equal(patch.success, true);
});

test('Gallery BFF cutover: API hooks', () => {
  const bffManaged = source('lib/db/bff-managed-tables.ts');
  const workspace = source('components/gallery/GalleryWorkspace.tsx');
  const galleryPageHook = source('hooks/useGalleryPage.ts');
  const updateHook = source('hooks/useUpdatePhoto.ts');
  const folderHook = source('hooks/usePhotoFolderMutations.ts');
  const catalogHook = source('hooks/useEnsureGalleryCatalogLoaded.ts');
  const photosApi = source('app/api/photos/route.ts');
  const photoIdApi = source('app/api/photos/[id]/route.ts');
  const foldersApi = source('app/api/photo-folders/route.ts');
  const uploadInit = source('app/api/photos/upload/init/route.ts');

  assert.match(bffManaged, /'photos'/);
  assert.match(bffManaged, /'photo_folders'/);
  assert.match(galleryPageHook, /\/api\/photo-folders/);
  assert.match(galleryPageHook, /\/api\/photos\/all/);
  assert.match(updateHook, /\/api\/photos/);
  assert.match(updateHook, /withoutAutoSyncAsync/);
  assert.match(folderHook, /\/api\/photo-folders/);
  assert.match(catalogHook, /\/api\/photos\/all/);
  assert.match(workspace, /useGalleryPage/);
  assert.match(workspace, /useUpdatePhoto/);
  assert.match(workspace, /usePhotoFolderMutations/);
  assert.doesNotMatch(workspace, /pushTablesToSupabase/);
  assert.match(photosApi, /gallery\.read/);
  assert.match(photoIdApi, /gallery\.write/);
  assert.match(foldersApi, /gallery\.read/);
  assert.match(foldersApi, /gallery\.write/);
  assert.match(uploadInit, /gallery\.write/);
});
