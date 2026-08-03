import { useStore } from '@/hooks/useStore';
import type { Attraction } from '../types';
import type { GalleryPhoto } from '../tour-design/tour-design-types';

const DAY_ABBREV: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function formatHoursCompact(hours: string): string[] {
  if (!hours?.trim()) return ['—'];
  let text = hours;
  for (const [full, abbr] of Object.entries(DAY_ABBREV)) {
    text = text.replace(new RegExp(full, 'gi'), abbr);
  }
  return text
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function closureTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/closed/g, '')
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3 && !['always', 'none', 'regular', 'officially'].includes(t));
}

export function getNonDuplicateAlert(alert: string, closed: string): string | null {
  if (!alert?.trim()) return null;
  const upper = alert.toUpperCase();
  if (upper.includes('OPEN DAILY') && (!closed || closed.toLowerCase() === 'none')) return null;

  const closedTokens = closureTokens(closed);
  const alertTokens = closureTokens(alert);
  const onlyClosure =
    alertTokens.length > 0 && alertTokens.every((t) => closedTokens.some((c) => c.includes(t) || t.includes(c)));
  if (onlyClosure && upper.includes('CLOSED')) return null;

  return alert;
}

export function truncateCell(text: string, max = 42): string {
  const t = text?.trim() || '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function formatHoursSingleLine(hours: string): string {
  return formatHoursCompact(hours).join(' · ');
}

export function getAttractionHighlight(
  attraction: Pick<Attraction, 'closed' | 'alert'>,
  todayLabel: string
): 'closed-today' | 'warning' | null {
  const todayKey = todayLabel.toUpperCase().slice(0, 3);
  if (attraction.closed.toUpperCase().includes(todayKey)) return 'closed-today';
  const alert = attraction.alert?.toUpperCase() || '';
  if (alert.includes('CLOSED') || alert.includes('BOOK')) return 'warning';
  return null;
}

export function galleryUrlForAttraction(attractionId: string, _name?: string, photoId?: string): string {
  const params = new URLSearchParams({ attraction: attractionId });
  if (photoId) params.set('photo', photoId);
  return `/gallery?${params.toString()}`;
}

export function photosForAttraction(
  allPhotos: GalleryPhoto[],
  attraction: Pick<Attraction, 'photoIds'>
): GalleryPhoto[] {
  const ids = attraction.photoIds ?? [];
  if (!ids.length) return [];
  const byId = new Map(allPhotos.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is GalleryPhoto => Boolean(p && (p.url || p.thumbUrl)));
}

/** All photos linked to an attraction pool. */
export function photosLinkedToAttraction(
  allPhotos: GalleryPhoto[],
  attraction: Pick<Attraction, 'linkedPhotoIds' | 'photoIds'>
): GalleryPhoto[] {
  const ids = attraction.linkedPhotoIds?.length
    ? attraction.linkedPhotoIds
    : (attraction.photoIds ?? []);
  if (!ids.length) return [];
  const byId = new Map(allPhotos.map((p) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is GalleryPhoto => Boolean(p && (p.url || p.thumbUrl)));
}

/** Link photo to pool and auto-feature if fewer than 4 featured slots used. */
export function linkPhotoToAttractionWithFeatured(attractionId: string, photoId: string) {
  const attractions = useStore.getState().attractions;
  const next = attractions.map((a) => {
    if (a.id !== attractionId) return a;
    const linked = a.linkedPhotoIds?.length ? a.linkedPhotoIds : (a.photoIds ?? []);
    const nextLinked = linked.includes(photoId) ? linked : [...linked, photoId];
    const featured = a.photoIds ?? [];
    const nextFeatured =
      featured.length < 4 && !featured.includes(photoId) ? [...featured, photoId] : featured;
    return { ...a, linkedPhotoIds: nextLinked, photoIds: nextFeatured };
  });
  useStore.setState({ attractions: next });
}

export function nextAttractionId(attractions: Attraction[], region: Attraction['region']): string {
  const prefix = region === 'north' ? 'ATT-N-' : region === 'central' ? 'ATT-C-' : 'ATT-S-';
  const nums = attractions
    .filter((a) => a.id.startsWith(prefix))
    .map((a) => parseInt(a.id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export const ATTRACTION_TYPE_LABELS: Record<string, string> = {
  museum: 'Museum',
  heritage: 'Heritage',
  temple: 'Temple',
  landmark: 'Landmark',
  nature: 'Nature',
};
