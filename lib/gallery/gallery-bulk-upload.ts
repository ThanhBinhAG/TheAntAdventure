import type { Product } from '@/lib/types';

export type BulkUploadSlot = 1 | 2 | null;

export type ParsedBulkFile = {
  file: File;
  fileName: string;
  productCode: string | null;
  slot: BulkUploadSlot;
  poolIndex: number | null;
  status: 'ok' | 'unknown_product' | 'invalid_name';
  message?: string;
};

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const SLOT_PATTERN = /^(.+)_(\d+)$/i;

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function stripExtension(name: string): string {
  return name.replace(IMAGE_EXT, '');
}

export function matchProductCode(prefix: string, productCodes: string[]): string | null {
  const normalized = prefix.trim();
  if (!normalized) return null;
  const sorted = [...productCodes].sort((a, b) => b.length - a.length);
  for (const code of sorted) {
    if (normalized === code) return code;
  }
  return null;
}

export function parseBulkFileName(
  fileName: string,
  productCodes: string[]
): Pick<ParsedBulkFile, 'productCode' | 'slot' | 'poolIndex' | 'status' | 'message'> {
  const base = stripExtension(basename(fileName));
  const match = base.match(SLOT_PATTERN);
  if (!match) {
    return {
      productCode: null,
      slot: null,
      poolIndex: null,
      status: 'invalid_name',
      message: 'Expected format: PRODUCT_CODE_1.jpg',
    };
  }

  const prefix = match[1];
  const num = parseInt(match[2], 10);
  const productCode = matchProductCode(prefix, productCodes);

  if (!productCode) {
    return {
      productCode: null,
      slot: null,
      poolIndex: null,
      status: 'unknown_product',
      message: `No tour matches "${prefix}"`,
    };
  }

  if (num === 1) return { productCode, slot: 1, poolIndex: null, status: 'ok' };
  if (num === 2) return { productCode, slot: 2, poolIndex: null, status: 'ok' };
  return { productCode, slot: null, poolIndex: num, status: 'ok' };
}

export function parseBulkFiles(files: FileList | File[], productCodes: string[]): ParsedBulkFile[] {
  const list = Array.from(files).filter((f) => IMAGE_EXT.test(f.name));
  return list.map((file) => {
    const parsed = parseBulkFileName(file.name, productCodes);
    return {
      file,
      fileName: file.name,
      ...parsed,
    };
  });
}

export type BulkSlotConflict = {
  productCode: string;
  slot: 1 | 2;
  existingPhotoId: string;
  newFileName: string;
};

export function findBulkSlotConflicts(
  parsed: ParsedBulkFile[],
  existingPhotos: { id: string; product?: string; slot?: 1 | 2 }[],
  overwrite: boolean
): BulkSlotConflict[] {
  if (overwrite) return [];
  const conflicts: BulkSlotConflict[] = [];
  const seen = new Map<string, string>();

  for (const row of parsed) {
    if (row.status !== 'ok' || !row.productCode || (row.slot !== 1 && row.slot !== 2)) continue;
    const key = `${row.productCode}:${row.slot}`;
    const existing = existingPhotos.find((p) => p.product === row.productCode && p.slot === row.slot);
    if (existing && !seen.has(key)) {
      seen.set(key, existing.id);
      conflicts.push({
        productCode: row.productCode,
        slot: row.slot,
        existingPhotoId: existing.id,
        newFileName: row.fileName,
      });
    }
  }
  return conflicts;
}

export function productRegionLabel(region: string): string {
  const map: Record<string, string> = {
    north: 'Northern Vietnam',
    central: 'Central Vietnam',
    south: 'Southern Vietnam',
    people: 'People & Culture',
    services: 'Services',
  };
  return map[region] || region;
}

export function groupProductsByRegion(products: Product[]): Map<string, Product[]> {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const r = p.region || 'other';
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(p);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}
