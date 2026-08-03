/**
 * API xuất bảng giá thành file PDF.
 *
 * Chức năng:
 * - Nhận dữ liệu bảng giá từ giao diện.
 * - Kiểm tra quyền `pricing.export` ở server.
 * - Chỉ admin hiện tại mới có quyền xuất PDF.
 */

import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { pricingExportFilename } from '@/lib/pricing/pricing-export';
import { renderPricingPdf, type PricingPdfInput } from '@/lib/pricing/pricing-pdf';
import type { PricingTableRow } from '@/lib/products/product-pricing-helpers';
import type { PlCurrency } from '@/lib/pricing/pricing-utils';
import { captureAppError } from '@/lib/system/app-logger';

export async function POST(request: Request) {
  // Bảo vệ thao tác xuất bảng giá bằng permission riêng.
  const permission = await checkPermissionForRequest('pricing.export');

  if (!permission.allowed) {
    return NextResponse.json(
      {
        error: permission.status === 401 ? 'Unauthorized' : 'Forbidden',
      },
      { status: permission.status },
    );
  }

  let body: {
    rows?: PricingTableRow[];
    currency?: PlCurrency;
    showCost?: boolean;
    filterSummary?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  const currency = body.currency ?? 'USD';
  const showCost = Boolean(body.showCost);

  const input: PricingPdfInput = {
    rows,
    meta: {
      currency,
      showCost,
      filterSummary: body.filterSummary,
      logoUrl: '/Logo-3.svg',
    },
  };

  try {
    const pdf = await renderPricingPdf(input);
    const filename = pricingExportFilename(currency).replace('.xlsx', '.pdf');
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    captureAppError('pricing/export', err, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
