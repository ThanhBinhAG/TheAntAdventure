import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canDeleteFolder,
  childFolders,
  countPhotosInFolder,
  createFolder,
  ensureUnsortedFolder,
  folderBreadcrumb,
  isDescendantFolder,
  nextFolderId,
  renameFolder,
  UNSORTED_FOLDER_ID,
  type PhotoFolder,
} from '../lib/gallery/photo-folders';

const base: PhotoFolder[] = [
  { id: UNSORTED_FOLDER_ID, name: 'Unsorted', parentId: null, sortOrder: 0, isSystem: true },
  { id: 'PF-001', name: 'Halong', parentId: null, sortOrder: 1 },
  { id: 'PF-002', name: 'Cruise', parentId: 'PF-001', sortOrder: 0 },
];

describe('photo-folders', () => {
  it('ensures Unsorted exists', () => {
    const next = ensureUnsortedFolder([]);
    assert.equal(next[0]?.id, UNSORTED_FOLDER_ID);
    assert.equal(ensureUnsortedFolder(base).length, base.length);
  });

  it('allocates next PF-### ids', () => {
    assert.equal(nextFolderId(base), 'PF-003');
    assert.equal(nextFolderId([]), 'PF-001');
  });

  it('lists children sorted with system first', () => {
    const roots = childFolders(base, null);
    assert.equal(roots[0]?.id, UNSORTED_FOLDER_ID);
    assert.equal(roots[1]?.id, 'PF-001');
    assert.deepEqual(
      childFolders(base, 'PF-001').map((f) => f.id),
      ['PF-002']
    );
  });

  it('builds breadcrumb from root to current', () => {
    assert.deepEqual(
      folderBreadcrumb(base, 'PF-002').map((f) => f.id),
      ['PF-001', 'PF-002']
    );
  });

  it('detects descendant folders', () => {
    assert.equal(isDescendantFolder(base, 'PF-002', 'PF-001'), true);
    assert.equal(isDescendantFolder(base, 'PF-001', 'PF-002'), false);
    assert.equal(isDescendantFolder(base, 'PF-001', 'PF-001'), true);
  });

  it('counts photos in a folder', () => {
    const photos = [
      { folderId: UNSORTED_FOLDER_ID },
      { folderId: 'PF-001' },
      { folderId: undefined },
    ];
    assert.equal(countPhotosInFolder(photos, UNSORTED_FOLDER_ID), 2);
    assert.equal(countPhotosInFolder(photos, 'PF-001'), 1);
  });

  it('blocks deleting system or non-empty folders', () => {
    assert.equal(canDeleteFolder(base, UNSORTED_FOLDER_ID, []).ok, false);
    assert.equal(canDeleteFolder(base, 'PF-001', []).ok, false); // has child
    assert.equal(canDeleteFolder(base, 'PF-002', [{ folderId: 'PF-002' }]).ok, false);
    assert.equal(canDeleteFolder(base, 'PF-002', []).ok, true);
  });

  it('creates and renames folders', () => {
    const { folders, folder } = createFolder(base, 'Sapa', null);
    assert.equal(folder.id, 'PF-003');
    assert.equal(folder.parentId, null);
    const renamed = renameFolder(folders, folder.id, 'Sa Pa');
    assert.equal(renamed.find((f) => f.id === folder.id)?.name, 'Sa Pa');
    assert.deepEqual(renameFolder(base, UNSORTED_FOLDER_ID, 'X'), base);
  });
});
