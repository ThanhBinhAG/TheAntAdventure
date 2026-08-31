import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { buildTaxCsv, taxExportFilename } from '@/lib/tax/tax-export';
import { taxPeriodQuerySchema } from '@/lib/tax/tax-input';
import { listTaxExportRowsServer } from '@/lib/tax/tax-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tax', route: '/api/tax-reports/export' },
    requiredPermission: 'tax.write',
    querySchema: taxPeriodQuerySchema,
  },
  async ({ supabase, query }) => {
    const rows = await listTaxExportRowsServer(supabase, query.period);
    const csv = buildTaxCsv(rows);
    const filename = taxExportFilename(query.period);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  },
);
