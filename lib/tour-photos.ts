import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';

export const VPHOTO: Record<string, string[]> = {
  hanoi: [
    'https://picsum.photos/seed/ant-hanoi1/480/320',
    'https://picsum.photos/seed/ant-hanoi2/480/320',
    'https://picsum.photos/seed/ant-hanoi3/480/320',
  ],
  halong: [
    'https://picsum.photos/seed/ant-halong1/480/320',
    'https://picsum.photos/seed/ant-halong2/480/320',
    'https://picsum.photos/seed/ant-halong3/480/320',
  ],
  ninhhbinh: [
    'https://picsum.photos/seed/ant-ninhhbinh1/480/320',
    'https://picsum.photos/seed/ant-ninhhbinh2/480/320',
    'https://picsum.photos/seed/ant-ninhhbinh3/480/320',
  ],
  maichau: [
    'https://picsum.photos/seed/ant-maichau1/480/320',
    'https://picsum.photos/seed/ant-maichau2/480/320',
    'https://picsum.photos/seed/ant-maichau3/480/320',
  ],
  hue: [
    'https://picsum.photos/seed/ant-hue1/480/320',
    'https://picsum.photos/seed/ant-hue2/480/320',
    'https://picsum.photos/seed/ant-hue3/480/320',
  ],
  hoian: [
    'https://picsum.photos/seed/ant-hoian1/480/320',
    'https://picsum.photos/seed/ant-hoian2/480/320',
    'https://picsum.photos/seed/ant-hoian3/480/320',
  ],
  danang: ['https://picsum.photos/seed/ant-danang1/480/320', 'https://picsum.photos/seed/ant-danang2/480/320'],
  hcmc: [
    'https://picsum.photos/seed/ant-hcmc1/480/320',
    'https://picsum.photos/seed/ant-hcmc2/480/320',
    'https://picsum.photos/seed/ant-hcmc3/480/320',
  ],
  mekong: [
    'https://picsum.photos/seed/ant-mekong1/480/320',
    'https://picsum.photos/seed/ant-mekong2/480/320',
    'https://picsum.photos/seed/ant-mekong3/480/320',
  ],
  cantho: [
    'https://picsum.photos/seed/ant-cantho1/480/320',
    'https://picsum.photos/seed/ant-cantho2/480/320',
    'https://picsum.photos/seed/ant-cantho3/480/320',
  ],
  sapa: [
    'https://picsum.photos/seed/ant-sapa1/480/320',
    'https://picsum.photos/seed/ant-sapa2/480/320',
    'https://picsum.photos/seed/ant-sapa3/480/320',
  ],
  north: [
    'https://picsum.photos/seed/ant-north1/480/320',
    'https://picsum.photos/seed/ant-north2/480/320',
    'https://picsum.photos/seed/ant-north3/480/320',
  ],
  central: [
    'https://picsum.photos/seed/ant-central1/480/320',
    'https://picsum.photos/seed/ant-central2/480/320',
    'https://picsum.photos/seed/ant-central3/480/320',
  ],
  south: [
    'https://picsum.photos/seed/ant-south1/480/320',
    'https://picsum.photos/seed/ant-south2/480/320',
    'https://picsum.photos/seed/ant-south3/480/320',
  ],
  generic: [
    'https://picsum.photos/seed/ant-viet1/480/320',
    'https://picsum.photos/seed/ant-viet2/480/320',
    'https://picsum.photos/seed/ant-viet3/480/320',
  ],
};

export type ResolvedPhoto = { url: string; caption?: string; photoId?: string };

function destinationKey(product: Pick<Product, 'dest' | 'name' | 'region'>): string {
  const d = (product.dest || '').toLowerCase();
  const n = (product.name || '').toLowerCase();
  let key =
    product.region === 'north' ? 'north' : product.region === 'central' ? 'central' : product.region === 'south' ? 'south' : 'generic';
  if (d.includes('han') || n.includes('hanoi')) key = 'hanoi';
  else if (d.includes('halong') || d.includes('ha long') || n.includes('halong')) key = 'halong';
  else if (d.includes('ninh binh') || n.includes('ninh binh')) key = 'ninhhbinh';
  else if (d.includes('mai chau') || n.includes('mai chau')) key = 'maichau';
  else if ((d.includes('hue') || n.includes('hue')) && !n.includes('hoi an')) key = 'hue';
  else if (d.includes('hoi an') || n.includes('hoi an')) key = 'hoian';
  else if (d.includes('dad') || d.includes('da nang')) key = 'danang';
  else if (d.includes('sgn') || d.includes('saigon') || d.includes('ho chi minh') || n.includes('saigon')) key = 'hcmc';
  else if (d.includes('can tho') || n.includes('can tho')) key = 'cantho';
  else if (d.includes('mekong') || n.includes('mekong') || n.includes('floating market')) key = 'mekong';
  else if (d.includes('sapa') || n.includes('sapa')) key = 'sapa';
  return key;
}

export function getDestinationPhotoPool(product: Pick<Product, 'dest' | 'name' | 'region'>, dayN = 0): string[] {
  const pool = VPHOTO[destinationKey(product)] || VPHOTO.generic;
  return [pool[dayN % pool.length], pool[(dayN + 1) % pool.length]];
}

export function getDayPhotos(
  dayTitle: string,
  pkgTag: string,
  hotelStr: string,
  dayN: number,
  count: number
): string[] {
  const t = (dayTitle || '').toLowerCase();
  const h = (hotelStr || '').toLowerCase();
  let key = pkgTag === 'north' ? 'north' : pkgTag === 'central' ? 'central' : pkgTag === 'south' ? 'south' : 'generic';
  if (t.includes('hanoi') || h.includes('hanoi') || h.includes('ma may')) key = 'hanoi';
  else if (t.includes('halong') || t.includes('ha long')) key = 'halong';
  else if (t.includes('ninh binh') || h.includes('ninh binh') || h.includes('hidden charm')) key = 'ninhhbinh';
  else if (t.includes('mai chau') || h.includes('mai chau') || h.includes('ecolodge') || h.includes('avana')) key = 'maichau';
  else if ((t.includes('hue') || h.includes('hue') || h.includes('medallion')) && !t.includes('hoi an')) key = 'hue';
  else if (t.includes('hoi an') || h.includes('hoi an') || h.includes('allegro')) key = 'hoian';
  else if (t.includes('da nang') || t.includes('danang')) key = 'danang';
  else if (t.includes('ho chi minh') || t.includes('saigon') || h.includes('saigon') || h.includes('la siesta premium')) key = 'hcmc';
  else if (t.includes('can tho') || h.includes('can tho') || h.includes('charmant')) key = 'cantho';
  else if (t.includes('mekong') || t.includes('delta')) key = 'mekong';
  const pool = VPHOTO[key] || VPHOTO.generic;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(dayN + i) % pool.length]);
  return out;
}

export function resolveProductPhotos(
  product: Product,
  allPhotos: GalleryPhoto[],
  count = 2,
  dayN = 0
): ResolvedPhoto[] {
  const linked = allPhotos.filter((p) => p.product === product.code && p.url);
  const fallback = getDestinationPhotoPool(product, dayN);
  const result: ResolvedPhoto[] = linked.slice(0, count).map((p) => ({
    url: p.url!,
    caption: p.caption,
    photoId: p.id,
  }));
  let fi = 0;
  while (result.length < count && fi < fallback.length) {
    const url = fallback[fi++];
    if (!result.some((r) => r.url === url)) {
      result.push({ url });
    }
  }
  return result.slice(0, count);
}
