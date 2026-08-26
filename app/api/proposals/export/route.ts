/**
 * API xuất Proposal PDF.
 *
 * Chức năng:
 * - Chỉ yêu cầu người gọi đã đăng nhập.
 * - Không kiểm tra role hoặc permission xuất PDF.
 * - Nhận dữ liệu proposal và tạo file PDF.
 */

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { renderProposalPdf } from '@/lib/proposals/proposal-pdf';
import type { ProposalDoc } from '@/lib/proposals/proposal-types';
import { createHttpRequestLogger } from '@/lib/system/server-logger';

export async function POST(request: Request) {
  const requestLog = createHttpRequestLogger(request, {
    scope: 'proposals/export',
    route: '/api/proposals/export',
  });
  const { logger: baseLogger, requestId, logCompletion } = requestLog;
  const startedAt = Date.now();
  const auth = await getAuthContext();
  const actorId = auth.authenticated ? auth.userId ?? undefined : undefined;
  const logger = actorId ? baseLogger.child({ actorId }) : baseLogger;
  const logResponse = (statusCode: number, resourceId?: string) => {
    logCompletion({ statusCode, durationMs: Date.now() - startedAt, actorId, resourceId });
  };

  if (!auth.authenticated) {
    logResponse(401);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'X-Request-Id': requestId } },
    );
  }

  let body: { proposalDoc?: ProposalDoc };
  try {
    body = await request.json();
  } catch {
    logResponse(400);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: { 'X-Request-Id': requestId } });
  }

  const doc = body.proposalDoc;
  if (!doc?.quoteRef || !doc?.tourTitle) {
    logResponse(400);
    return NextResponse.json({ error: 'proposalDoc is required' }, { status: 400, headers: { 'X-Request-Id': requestId } });
  }

  try {
    const pdf = await renderProposalPdf(doc);
    const filename = `${doc.quoteRef}-${(doc.customerName || 'proposal').replace(/\s+/g, '_')}.pdf`;
    logger.info(
      { event: 'proposal_pdf.export_completed', resourceId: doc.quoteRef, durationMs: Date.now() - startedAt },
      'Proposal PDF exported'
    );
    logResponse(200, doc.quoteRef);
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
    logger.error({ event: 'proposal_pdf.export_failed', err }, 'Proposal PDF export failed');
    logResponse(500, doc.quoteRef);
    return NextResponse.json({ error: message }, { status: 500, headers: { 'X-Request-Id': requestId } });
  }
}
