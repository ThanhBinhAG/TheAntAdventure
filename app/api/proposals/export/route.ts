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
import { captureAppError } from '@/lib/system/app-logger';

export async function POST(request: Request) {
  const auth = await getAuthContext();

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  let body: { proposalDoc?: ProposalDoc };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const doc = body.proposalDoc;
  if (!doc?.quoteRef || !doc?.tourTitle) {
    return NextResponse.json({ error: 'proposalDoc is required' }, { status: 400 });
  }

  try {
    const pdf = await renderProposalPdf(doc);
    const filename = `${doc.quoteRef}-${(doc.customerName || 'proposal').replace(/\s+/g, '_')}.pdf`;
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
    captureAppError('proposals/export', err, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
