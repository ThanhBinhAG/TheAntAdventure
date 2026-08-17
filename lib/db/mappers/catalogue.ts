import type { Product, ProductPricing } from '../../types';
import { money, type Row } from './shared';

export function rowToAttraction(r: Row): Row {
  return {
    id: String(r.id),
    region: String(r.region ?? 'north'),
    type: String(r.type ?? ''),
    name: String(r.name ?? ''),
    dest: String(r.dest ?? ''),
    hours: String(r.hours ?? ''),
    closed: String(r.closed ?? ''),
    admission: String(r.admission ?? ''),
    duration: Number(r.duration ?? 0),
    best_time: String(r.best_time ?? ''),
    crowd: String(r.crowd ?? ''),
    book_req: Boolean(r.book_req),
    seasonal: String(r.seasonal ?? ''),
    notes: String(r.notes ?? ''),
    alert: String(r.alert ?? ''),
    phone: String(r.phone ?? ''),
    photoIds: [],
    linkedPhotoIds: [],
  };
}

export function attractionToRow(a: Row): Row {
  return {
    id: a.id,
    region: a.region,
    type: a.type,
    name: a.name,
    dest: a.dest,
    hours: a.hours ?? null,
    closed: a.closed ?? null,
    admission: a.admission ?? null,
    duration: a.duration ?? 0,
    best_time: a.best_time ?? null,
    crowd: a.crowd ?? null,
    book_req: Boolean(a.book_req),
    seasonal: a.seasonal ?? null,
    notes: a.notes ?? null,
    alert: a.alert ?? null,
    phone: a.phone ?? '',
  };
}

export function assembleAttractions(baseRows: Row[], linkRows: Row[]): Row[] {
  const photosByAttraction = new Map<
    string,
    { photoId: string; sortOrder: number; isFeatured: boolean }[]
  >();
  for (const link of linkRows) {
    const attId = String(link.attraction_id);
    if (!photosByAttraction.has(attId)) photosByAttraction.set(attId, []);
    photosByAttraction.get(attId)!.push({
      photoId: String(link.photo_id),
      sortOrder: Number(link.sort_order ?? 0),
      isFeatured: Boolean(link.is_featured),
    });
  }

  return baseRows.map((r) => {
    const base = rowToAttraction(r);
    const links = photosByAttraction.get(String(base.id)) ?? [];
    links.sort((a, b) => a.sortOrder - b.sortOrder);
    const linkedPhotoIds = links.map((l) => l.photoId);
    const featuredLinks = links.filter((l) => l.isFeatured);
    const photoIds =
      featuredLinks.length > 0
        ? featuredLinks.map((l) => l.photoId).slice(0, 4)
        : linkedPhotoIds.slice(0, 4);
    return { ...base, linkedPhotoIds, photoIds };
  });
}

/** Build junction rows for Supabase sync from an attraction's pool + featured sets. */
export function attractionPhotoRows(attraction: {
  id: string;
  photoIds?: string[];
  linkedPhotoIds?: string[];
}): Row[] {
  const linked =
    attraction.linkedPhotoIds?.length
      ? attraction.linkedPhotoIds
      : (attraction.photoIds ?? []);
  const featured = (attraction.photoIds ?? []).filter((id) => linked.includes(id)).slice(0, 4);
  const featuredSet = new Set(featured);
  const poolOnly = linked.filter((id) => !featuredSet.has(id));

  return [
    ...featured.map((photoId, i) => ({
      attraction_id: attraction.id,
      photo_id: photoId,
      sort_order: i,
      is_featured: true,
    })),
    ...poolOnly.map((photoId, i) => ({
      attraction_id: attraction.id,
      photo_id: photoId,
      sort_order: featured.length + i,
      is_featured: false,
    })),
  ];
}

export function rowToProduct(r: Row): Product {
  return {
    code: String(r.code),
    name: String(r.name ?? ''),
    logic: String(r.logic ?? ''),
    dur: String(r.duration ?? ''),
    cat: String(r.category ?? ''),
    dest: String(r.destination ?? ''),
    lvl: String(r.level ?? ''),
    desc: String(r.description ?? ''),
    usp: String(r.usp ?? ''),
    notesToSales: String(r.notes_to_sales ?? ''),
    price: String(r.price_from ?? ''),
    region: String(r.region ?? ''),
    photoIds: [],
    linkedPhotoIds: [],
  };
}

export function productToRow(p: Product): Row {
  return {
    code: p.code,
    name: p.name,
    logic: p.logic,
    duration: p.dur,
    category: p.cat,
    destination: p.dest,
    level: p.lvl,
    description: p.desc,
    usp: p.usp,
    notes_to_sales: p.notesToSales ?? '',
    price_from: p.price,
    region: p.region,
  };
}

export function rowToProductPricing(r: Row): ProductPricing {
  return {
    productCode: String(r.product_code),
    stdCost: money(r.std_cost),
    p1: money(r.p1),
    p2: money(r.p2),
    p3: money(r.p3),
    p4: money(r.p4),
    p5: money(r.p5),
    p6: money(r.p6),
    p7: money(r.p7),
    p8: money(r.p8),
    p9: money(r.p9),
    p10: money(r.p10),
    c1: money(r.c1),
    c2: money(r.c2),
    c3: money(r.c3),
    c4: money(r.c4),
    c5: money(r.c5),
    c6: money(r.c6),
    c7: money(r.c7),
    c8: money(r.c8),
    c9: money(r.c9),
    c10: money(r.c10),
    incl: {
      g: Boolean(r.incl_guide),
      tr: Boolean(r.incl_transport),
      tk: Boolean(r.incl_tickets),
      w: Boolean(r.incl_water),
      m: Boolean(r.incl_meals),
    },
  };
}

export function productPricingToRow(p: ProductPricing): Row {
  return {
    product_code: p.productCode,
    std_cost: money(p.stdCost),
    p1: money(p.p1),
    p2: money(p.p2),
    p3: money(p.p3),
    p4: money(p.p4),
    p5: money(p.p5),
    p6: money(p.p6),
    p7: money(p.p7),
    p8: money(p.p8),
    p9: money(p.p9),
    p10: money(p.p10),
    c1: money(p.c1),
    c2: money(p.c2),
    c3: money(p.c3),
    c4: money(p.c4),
    c5: money(p.c5),
    c6: money(p.c6),
    c7: money(p.c7),
    c8: money(p.c8),
    c9: money(p.c9),
    c10: money(p.c10),
    incl_guide: p.incl.g,
    incl_transport: p.incl.tr,
    incl_tickets: p.incl.tk,
    incl_water: p.incl.w,
    incl_meals: p.incl.m,
  };
}

/** Attach product_photos junction onto product rows (featured + pool). */
export function assembleProducts(baseRows: Row[], linkRows: Row[]): Row[] {
  const photosByProduct = new Map<
    string,
    { photoId: string; sortOrder: number; isFeatured: boolean }[]
  >();
  for (const link of linkRows) {
    const code = String(link.product_code);
    if (!photosByProduct.has(code)) photosByProduct.set(code, []);
    photosByProduct.get(code)!.push({
      photoId: String(link.photo_id),
      sortOrder: Number(link.sort_order ?? 0),
      isFeatured: Boolean(link.is_featured),
    });
  }

  return baseRows.map((r) => {
    const base = rowToProduct(r);
    const links = photosByProduct.get(String(base.code)) ?? [];
    links.sort((a, b) => a.sortOrder - b.sortOrder);
    const linkedPhotoIds = links.map((l) => l.photoId);
    const featuredLinks = links.filter((l) => l.isFeatured);
    const photoIds =
      featuredLinks.length > 0
        ? featuredLinks.map((l) => l.photoId).slice(0, 2)
        : linkedPhotoIds.slice(0, 2);
    return { ...base, linkedPhotoIds, photoIds };
  });
}

/** Build junction rows for Supabase sync from a product's pool + featured sets. */
export function productPhotoRows(product: {
  code: string;
  photoIds?: string[];
  linkedPhotoIds?: string[];
}): Row[] {
  const linked =
    product.linkedPhotoIds?.length
      ? product.linkedPhotoIds
      : (product.photoIds ?? []);
  const featured = (product.photoIds ?? []).filter((id) => linked.includes(id)).slice(0, 2);
  const featuredSet = new Set(featured);
  const poolOnly = linked.filter((id) => !featuredSet.has(id));

  return [
    ...featured.map((photoId, i) => ({
      product_code: product.code,
      photo_id: photoId,
      sort_order: i,
      is_featured: true,
    })),
    ...poolOnly.map((photoId, i) => ({
      product_code: product.code,
      photo_id: photoId,
      sort_order: featured.length + i,
      is_featured: false,
    })),
  ];
}
