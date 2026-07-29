/**
 * When linking a photo into the product pool, auto-fill featured slots
 * until `maxFeatured` is reached so catalog badges (e.g. 0/2 → 1/2) update.
 */
export function nextFeaturedAfterLink(
  featured: string[],
  photoId: string,
  maxFeatured: number
): string[] {
  if (featured.includes(photoId)) return featured;
  if (featured.length >= maxFeatured) return featured;
  return [...featured, photoId].slice(0, maxFeatured);
}

/** Toggle link membership; linking auto-features when slots remain. */
export function nextSelectionAfterLinkToggle(
  linked: string[],
  featured: string[],
  photoId: string,
  maxFeatured: number
): { linked: string[]; featured: string[] } {
  if (linked.includes(photoId)) {
    return {
      linked: linked.filter((id) => id !== photoId),
      featured: featured.filter((id) => id !== photoId),
    };
  }
  return {
    linked: [...linked, photoId],
    featured: nextFeaturedAfterLink(featured, photoId, maxFeatured),
  };
}
