/**
 * API xuất Proposal PDF.
 *
 * Chức năng:
 * - Nhận dữ liệu proposal từ giao diện.
 * - Kiểm tra quyền `tour_design.export` ở server.
 * - Chỉ tạo và trả PDF khi người dùng được cấp quyền.
 */

import { NextResponse } from 'next/server';
import { checkProposalExportPermission } from '@/lib/proposals/proposal-auth';
import { renderProposalPdf } from '@/lib/proposals/proposal-pdf';
import type { ProposalDoc } from '@/lib/proposals/proposal-types';
import { captureAppError } from '@/lib/system/app-logger';

export async function POST(request: Request) {
  // Kiểm tra quyền tại server, không tin quyền do trình duyệt gửi lên.
  const permission = await checkProposalExportPermission();

  if (!permission.allowed) {
    return NextResponse.json(
      {
        error: permission.status === 401 ? 'Unauthorized' : 'Forbidden',
      },
      { status: permission.status },
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
