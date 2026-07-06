import { NextResponse } from 'next/server';
import { isProposalExportAuthorized } from '@/lib/proposal-auth';
import { renderProposalPdf } from '@/lib/proposal-pdf';
import type { ProposalDoc } from '@/lib/proposal-types';

export async function POST(request: Request) {
  const allowed = await isProposalExportAuthorized();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('[proposals/export]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
