/** System inbox folder for unclassified gallery photos. */
export const UNSORTED_FOLDER_ID = 'PF-unsorted';

export type PhotoFolder = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isSystem?: boolean;
  createdAt?: string;
};

export function ensureUnsortedFolder(folders: PhotoFolder[]): PhotoFolder[] {
  if (folders.some((f) => f.id === UNSORTED_FOLDER_ID)) return folders;
  return [
    {
      id: UNSORTED_FOLDER_ID,
      name: 'Unsorted',
      parentId: null,
      sortOrder: 0,
      isSystem: true,
    },
    ...folders,
  ];
}

export function nextFolderId(folders: PhotoFolder[]): string {
  let max = 0;
  for (const f of folders) {
    const m = /^PF-(\d+)$/i.exec(f.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `PF-${String(max + 1).padStart(3, '0')}`;
}

export function childFolders(
  folders: PhotoFolder[],
  parentId: string | null
): PhotoFolder[] {
  return folders
    .filter((f) => (f.parentId ?? null) === parentId)
    .sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
}

export function folderById(
  folders: PhotoFolder[],
  id: string | null | undefined
): PhotoFolder | undefined {
  if (!id) return undefined;
  return folders.find((f) => f.id === id);
}

/** Ancestor chain from root → current (inclusive). */
export function folderBreadcrumb(
  folders: PhotoFolder[],
  folderId: string | null
): PhotoFolder[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain: PhotoFolder[] = [];
  let cur: PhotoFolder | undefined = byId.get(folderId);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

export function isDescendantFolder(
  folders: PhotoFolder[],
  folderId: string,
  possibleAncestorId: string
): boolean {
  if (folderId === possibleAncestorId) return true;
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur = byId.get(folderId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.parentId === possibleAncestorId) return true;
    cur = byId.get(cur.parentId);
  }
  return false;
}

export function countPhotosInFolder(
  photos: { folderId?: string }[],
  folderId: string
): number {
  return photos.filter((p) => (p.folderId || UNSORTED_FOLDER_ID) === folderId).length;
}

export function canDeleteFolder(
  folders: PhotoFolder[],
  folderId: string,
  photos: { folderId?: string }[]
): { ok: boolean; reason?: string } {
  const folder = folderById(folders, folderId);
  if (!folder) return { ok: false, reason: 'Folder not found' };
  if (folder.isSystem || folder.id === UNSORTED_FOLDER_ID) {
    return { ok: false, reason: 'System folders cannot be deleted' };
  }
  if (childFolders(folders, folderId).length > 0) {
    return { ok: false, reason: 'Move or delete subfolders first' };
  }
  if (countPhotosInFolder(photos, folderId) > 0) {
    return { ok: false, reason: 'Move or delete photos first' };
  }
  return { ok: true };
}

export function renameFolder(
  folders: PhotoFolder[],
  folderId: string,
  name: string
): PhotoFolder[] {
  const trimmed = name.trim();
  if (!trimmed) return folders;
  const folder = folderById(folders, folderId);
  if (!folder || folder.isSystem) return folders;
  return folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f));
}

export function createFolder(
  folders: PhotoFolder[],
  name: string,
  parentId: string | null
): { folders: PhotoFolder[]; folder: PhotoFolder } {
  const folder: PhotoFolder = {
    id: nextFolderId(folders),
    name: name.trim() || 'New folder',
    parentId,
    sortOrder: childFolders(folders, parentId).length,
    isSystem: false,
  };
  return { folders: [...folders, folder], folder };
}

/** Flat tree rows for Move-to pickers (depth for indent). */
export function folderTreeRows(
  folders: PhotoFolder[],
  parentId: string | null = null,
  depth = 0
): { folder: PhotoFolder; depth: number }[] {
  const rows: { folder: PhotoFolder; depth: number }[] = [];
  for (const f of childFolders(folders, parentId)) {
    rows.push({ folder: f, depth });
    rows.push(...folderTreeRows(folders, f.id, depth + 1));
  }
  return rows;
}
