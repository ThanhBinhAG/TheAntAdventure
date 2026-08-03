import { getSellPrice } from '@/lib/tour-design/tour-pricing';
import type { Product } from '@/lib/types';

export const MODULE_REGIONS = ['north', 'central', 'south'] as const;
export type ModuleRegion = (typeof MODULE_REGIONS)[number];

export const MODULE_DUR_KEYS = ['0.5', '1', '2', '3', '4'] as const;
export type ModuleDurKey = (typeof MODULE_DUR_KEYS)[number];

export const DUR_LABELS: Record<ModuleDurKey, string> = {
  '0.5': 'Half Day',
  '1': 'Full Day',
  '2': '2 Days / 1 Night',
  '3': '3 Days / 2 Nights',
  '4': '4 Days / 3 Nights',
};

export const DUR_KEY_TO_PRODUCT_DUR: Record<ModuleDurKey, string> = {
  '0.5': 'Half Day',
  '1': 'Full Day',
  '2': '2 Days 1 Night',
  '3': '3 Days 2 Nights',
  '4': '4 Days 3 Nights',
};

export function isProductActive(p: Product): boolean {
  return (p.status ?? 'active') === 'active';
}

export function durToModuleKey(dur: string): ModuleDurKey | null {
  const d = (dur || '').toLowerCase().trim();
  if (!d || d.includes('service')) return null;
  if (d.includes('half') || d.includes('evening')) return '0.5';
  if (d.includes('full day') || d === 'full day') return '1';
  if (d.includes('2 day') || d.includes('2d1n')) return '2';
  if (d.includes('3 day') || d.includes('3d2n')) return '3';
  if (d.includes('4 day') || d.includes('4d3n')) return '4';
  return null;
}

export function moduleKeyToDur(key: ModuleDurKey): string {
  return DUR_KEY_TO_PRODUCT_DUR[key];
}

export function getModulePriceRange(code: string, fallbackPrice?: string): string {
  const hi = getSellPrice(code, 10);
  const lo = getSellPrice(code, 1);
  if (hi > 0 && lo > 0) return `$${hi}–$${lo}/pax`;
  if (fallbackPrice?.trim()) return fallbackPrice;
  return '—';
}

export function filterProductsForModules(products: Product[], search: string): Product[] {
  const q = search.toLowerCase().trim();
  return products.filter((p) => {
    if (!isProductActive(p)) return false;
    if (!MODULE_REGIONS.includes(p.region as ModuleRegion)) return false;
    if (!durToModuleKey(p.dur)) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    );
  });
}

export type ModulesGrouped = Record<ModuleRegion, Partial<Record<ModuleDurKey, Product[]>>>;

export function groupProductsForModules(products: Product[], search = ''): ModulesGrouped {
  const filtered = filterProductsForModules(products, search);
  const grouped = {} as ModulesGrouped;
  for (const r of MODULE_REGIONS) grouped[r] = {};

  filtered.forEach((p) => {
    const r = p.region as ModuleRegion;
    const dk = durToModuleKey(p.dur);
    if (!dk || !grouped[r]) return;
    if (!grouped[r][dk]) grouped[r][dk] = [];
    grouped[r][dk]!.push(p);
  });

  return grouped;
}

export function countModulesProducts(grouped: ModulesGrouped): number {
  let n = 0;
  for (const r of MODULE_REGIONS) {
    const durs = grouped[r];
    if (!durs) continue;
    for (const dk of MODULE_DUR_KEYS) {
      n += durs[dk]?.length ?? 0;
    }
  }
  return n;
}

/** Flat product list in region → duration display order (for pagination). */
export function flattenModulesProducts(grouped: ModulesGrouped): Product[] {
  const items: Product[] = [];
  for (const r of MODULE_REGIONS) {
    const durs = grouped[r];
    if (!durs) continue;
    for (const dk of MODULE_DUR_KEYS) {
      const prods = durs[dk];
      if (prods?.length) items.push(...prods);
    }
  }
  return items;
}

/** Re-group an already-filtered product page (no search re-filter). */
export function groupModulesProductPage(products: Product[]): ModulesGrouped {
  const grouped = {} as ModulesGrouped;
  for (const r of MODULE_REGIONS) grouped[r] = {};
  products.forEach((p) => {
    const r = p.region as ModuleRegion;
    const dk = durToModuleKey(p.dur);
    if (!dk || !grouped[r]) return;
    if (!grouped[r][dk]) grouped[r][dk] = [];
    grouped[r][dk]!.push(p);
  });
  return grouped;
}
