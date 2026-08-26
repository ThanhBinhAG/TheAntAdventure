/**
 * API xuất bảng giá thành file PDF.
 *
 * Chức năng:
 * - Chỉ yêu cầu người gọi đã đăng nhập.
 * - Không kiểm tra role hoặc permission xuất PDF.
 * - Nhận dữ liệu bảng giá và tạo file PDF.
 */

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { pricingExportFilename } from '@/lib/pricing/pricing-export';
import { renderPricingPdf, type PricingPdfInput } from '@/lib/pricing/pricing-pdf';
import type { PricingTableRow } from '@/lib/products/product-pricing-helpers';
import type { PlCurrency } from '@/lib/pricing/pricing-utils';
import { createHttpRequestLogger } from '@/lib/system/server-logger';

export async function POST(request: Request) {
  const requestLog = createHttpRequestLogger(request, {
    scope: 'pricing/export',
    route: '/api/pricing/export',
  });
  const { logger: baseLogger, requestId, logCompletion } = requestLog;
  const startedAt = Date.now();
  const auth = await getAuthContext();
  const actorId = auth.authenticated ? auth.userId ?? undefined : undefined;
  const logger = actorId ? baseLogger.child({ actorId }) : baseLogger;
  const logResponse = (statusCode: number) => {
    logCompletion({ statusCode, durationMs: Date.now() - startedAt, actorId });
  };

  if (!auth.authenticated) {
    logResponse(401);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'X-Request-Id': requestId } },
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
    logResponse(400);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: { 'X-Request-Id': requestId } });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    logResponse(400);
    return NextResponse.json({ error: 'rows array is required' }, { status: 400, headers: { 'X-Request-Id': requestId } });
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
    logger.info(
      { event: 'pricing_pdf.export_completed', currency, rowCount: rows.length, durationMs: Date.now() - startedAt },
      'Pricing PDF exported'
    );
    logResponse(200);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Request-Id': requestId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    logger.error({ event: 'pricing_pdf.export_failed', err }, 'Pricing PDF export failed');
    logResponse(500);
    return NextResponse.json({ error: message }, { status: 500, headers: { 'X-Request-Id': requestId } });
  }
}
