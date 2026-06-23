import {
  buildProductCode,
  suggestTypeSegment,
  type TypeSegment,
} from '@/lib/product-code';
import {
  DUR_KEY_TO_PRODUCT_DUR,
  durToModuleKey,
  moduleKeyToDur,
  type ModuleDurKey,
} from '@/lib/product-modules';
import type { Product } from '@/lib/types';

export const PRODUCT_CATEGORIES = [
  'Cultural',
  'Transfer',
  'Culinary',
  'Cycling',
  'Nature',
  'Service',
  'Adventure',
  'Arts & Crafts',
  'Experience',
  'Adventure & Culture',
  'Wellness',
  'Photography',
  'History',
  'Visa',
] as const;

export const PRODUCT_LEVELS = [
  'Easy & Comfortable',
  'Moderate',
  'Challenging',
  'Standard',
] as const;

export const PRODUCT_DURATIONS = [
  'Half Day',
  'Full Day',
  'Evening (2–3 hours)',
  'Evening (3–4 hours)',
  '2 Days 1 Night',
  '3 Days 2 Nights',
  '4 Days 3 Nights',
  'Service',
] as const;

export interface ProductFormState {
  code: string;
  name: string;
  nameVn: string;
  region: string;
  dur: string;
  cat: string;
  dest: string;
  typeSegment: string;
  lvl: string;
  desc: string;
  usp: string;
  logic: string;
  price: string;
  status: 'active' | 'draft' | 'archived';
}

export function emptyProductForm(region = 'north', existingCodes: string[] = []): ProductFormState {
  const dur = 'Half Day';
  const cat = 'Cultural';
  const dest = region === 'services' ? 'All Vietnam' : 'Hanoi';
  const typeSegment = suggestTypeSegment(region, dur, cat);
  let code = '';
  try {
    code = buildProductCode({ region, dest, dur, cat, typeSegment }, existingCodes);
  } catch {
    code = '';
  }
  return {
    code,
    name: '',
    nameVn: '',
    region,
    dur,
    cat,
    dest,
    typeSegment,
    lvl: 'Easy & Comfortable',
    desc: '',
    usp: '',
    logic: '',
    price: '',
    status: 'active',
  };
}

/** @deprecated Use buildProductCode from lib/product-code instead */
export function generateProductCode(region: string): string {
  return emptyProductForm(region).code;
}

export function regenerateProductCode(
  form: Pick<ProductFormState, 'region' | 'dest' | 'dur' | 'cat' | 'typeSegment'>,
  existingCodes: string[]
): string {
  return buildProductCode(
    {
      region: form.region,
      dest: form.dest,
      dur: form.dur,
      cat: form.cat,
      typeSegment: form.typeSegment,
    },
    existingCodes
  );
}

export function inferTypeSegmentFromCode(code: string): TypeSegment | string {
  if (code.startsWith('SV-')) {
    const inner = code.replace(/^SV-/, '').replace(/-\d{2}$/, '');
    return inner || 'SGN-HD';
  }
  const parts = code.split('-');
  if (parts.length >= 5 && parts[0] === 'AA') {
    return parts.slice(3, -1).join('-');
  }
  return suggestTypeSegment('north', 'Half Day', 'Cultural');
}

export function productToForm(p: Product): ProductFormState {
  const region = p.region || 'north';
  const dur = p.dur || 'Half Day';
  const cat = p.cat || 'Cultural';
  return {
    code: p.code,
    name: p.name,
    nameVn: p.nameVn ?? '',
    region,
    dur,
    cat,
    dest: p.dest || '',
    typeSegment: inferTypeSegmentFromCode(p.code) || suggestTypeSegment(region, dur, cat),
    lvl: p.lvl || 'Easy & Comfortable',
    desc: p.desc || '',
    usp: p.usp || '',
    logic: p.logic || '',
    price: p.price || '',
    status: p.status ?? 'active',
  };
}

export function formToProduct(form: ProductFormState): Product {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    nameVn: form.nameVn.trim() || undefined,
    region: form.region,
    dur: form.dur,
    cat: form.cat,
    dest: form.dest.trim(),
    lvl: form.lvl,
    desc: form.desc.trim(),
    usp: form.usp.trim(),
    logic: form.logic.trim(),
    price: form.price.trim(),
    status: form.status,
  };
}

export function deriveCategoriesFromProducts(products: Product[]): string[] {
  const set = new Set<string>(PRODUCT_CATEGORIES);
  products.forEach((p) => {
    if (p.cat?.trim()) set.add(p.cat.trim());
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function moduleDurSelectValue(dur: string): ModuleDurKey | '' {
  return durToModuleKey(dur) ?? '';
}

export function setFormDurFromModuleKey(form: ProductFormState, key: ModuleDurKey): ProductFormState {
  return { ...form, dur: moduleKeyToDur(key) };
}

export { DUR_KEY_TO_PRODUCT_DUR };
