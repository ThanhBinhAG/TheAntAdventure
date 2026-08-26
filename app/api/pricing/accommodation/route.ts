import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  loadAccommodationCatalog,
  loadLatestImport,
  replaceAccommodationCatalog,
  updateCatalogRow,
} from '@/lib/pricing/catalog-db';
import {
  accommodationCatalogSchema,
  catalogImportMetaSchema,
  catalogRowPatchSchema,
} from '@/lib/pricing/catalog-schema';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  table: z.enum(['settings', 'properties', 'roomRates', 'cruiseRates']),
  id: z.string().min(1).max(200),
  patch: catalogRowPatchSchema,
});

export const GET = bffRoute(
  { requiredPermission: 'pricing_accommodation.read' },
  async ({ supabase }) => {
    const [catalog, lastImport] = await Promise.all([
      loadAccommodationCatalog(supabase),
      loadLatestImport(supabase, 'accommodation'),
    ]);
    return { catalog, lastImport };
  },
);

export const PATCH = bffRoute(
  { requiredPermission: 'pricing_accommodation.write', bodySchema: patchSchema },
  async ({ supabase, body }) => {
    await updateCatalogRow(supabase, body.table, body.id, body.patch);
    return { saved: true };
  },
);

export const POST = bffRoute(
  {
    requiredPermission: 'pricing_accommodation.write',
    bodySchema: z.object({ catalog: accommodationCatalogSchema, meta: catalogImportMetaSchema }),
  },
  async ({ supabase, body }) => ({
    rowCount: await replaceAccommodationCatalog(supabase, body.catalog, body.meta),
  }),
);
