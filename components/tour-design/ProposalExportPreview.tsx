'use client';

import { useEffect, useMemo, useState } from 'react';
import ProposalDocumentCanvas from '@/components/tour-design/ProposalDocumentCanvas';
import { buildProposalHTML } from '@/lib/proposals/proposal-html';
import { getProposalLayoutMeta, type ProposalLayoutId } from '@/lib/proposals/proposal-layouts';
import type { ProposalDoc } from '@/lib/proposals/proposal-types';

interface Props {
  proposalDoc: ProposalDoc;
  layoutId: ProposalLayoutId;
  hasContent: boolean;
}

/**
 * Live proposal preview. Layout switches update immediately; content edits
 * debounce ~300ms. Rendering is delegated to ProposalDocumentCanvas.
 */
export default function ProposalExportPreview({ proposalDoc, layoutId, hasContent }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const liveHtml = useMemo(
    () => (hasContent ? buildProposalHTML(proposalDoc, origin) : ''),
    [proposalDoc, hasContent, origin]
  );

  const [displayHtml, setDisplayHtml] = useState(liveHtml);
  const [prevLayoutId, setPrevLayoutId] = useState(layoutId);

  if (layoutId !== prevLayoutId) {
    setPrevLayoutId(layoutId);
    setDisplayHtml(liveHtml);
  }

  useEffect(() => {
    if (displayHtml === liveHtml) return;
    const timer = window.setTimeout(() => setDisplayHtml(liveHtml), 300);
    return () => window.clearTimeout(timer);
  }, [liveHtml, displayHtml]);

  const updating = displayHtml !== liveHtml;
  const meta = getProposalLayoutMeta(layoutId);

  return (
    <ProposalDocumentCanvas
      html={displayHtml}
      title="Proposal preview"
      leading={
        <>
          <strong>{meta.label}</strong>
          <span className="td-export-preview-meta">· A4</span>
        </>
      }
      status={
        <span className={`td-export-pill${updating ? ' is-busy' : hasContent ? ' is-ready' : ''}`}>
          {updating ? 'Updating…' : hasContent ? 'Updated' : '—'}
        </span>
      }
      emptyHint="Add experiences, a package, or outline days to preview the proposal."
    />
  );
}
