/**
 * Accent / spacing–tolerant search for gallery captions and tags.
 * "Can Tho", "Cần Thơ", and "CanTho" all fold to the same token stream.
 */

export function foldSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Compact form with spaces removed — so "CanTho" matches "Can Tho". */
export function foldSearchCompact(value: string): string {
  return foldSearchText(value).replace(/\s+/g, '');
}

export function matchesFoldedQuery(haystack: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const foldedHay = foldSearchText(haystack);
  const foldedQ = foldSearchText(q);
  if (foldedHay.includes(foldedQ)) return true;
  const compactHay = foldSearchCompact(haystack);
  const compactQ = foldSearchCompact(q);
  return compactHay.includes(compactQ);
}

export function photoMatchesSearchQuery(
  photo: { id: string; caption?: string; tags?: string[] },
  query: string
): boolean {
  const hay = `${photo.caption ?? ''} ${(photo.tags ?? []).join(' ')} ${photo.id}`;
  return matchesFoldedQuery(hay, query);
}
