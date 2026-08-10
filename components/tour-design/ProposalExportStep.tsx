'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  assembleProposalDoc,
  extractHotelBlocksFromOutline,
  seedOptionBHotelRates,
} from '@/lib/proposals/proposal-assembler';
import {
  applyProposalContentOverrides,
  hasProposalTemplateOverrides,
  type ProposalTemplateOverrides,
} from '@/lib/proposals/proposal-content-overrides';
import { buildProposalHTML, downloadProposalWord } from '@/lib/proposals/proposal-html';
import type { GalleryPhoto, TourBrief } from '@/lib/tour-design/tour-design-types';
import type { ProposalHotelRatesPersist } from '@/lib/tour-design/tour-draft-utils';
import type { ExperienceOverride, Hotel, Product, TourOutlineDay } from '@/lib/types';
import type { ProposalDoc, ProposalHotelRate } from '@/lib/proposals/proposal-types';
import ProposalHotelRatesPanel from '@/components/tour-design/ProposalHotelRatesPanel';
import ProposalEditorModal from '@/components/tour-design/ProposalEditorModal';
import { toast } from '@/lib/toast';

function formatPdfDownloadError(message: string): string {
  if (/libnspr4|libnss3|browser process|Code:\s*127|shared libraries|could not start Chromium/i.test(message)) {
    return `${message}\n\nWSL/Linux: run \`bash scripts/setup-pdf-deps-wsl.sh\`, restart \`npm run dev\`, or use Print / Save PDF.`;
  }
  return message;
}

interface Props {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  customerName: string;
  selectedProducts: Product[];
  selectedCodes: string[];
  selectedPackageId: string | null;
  experienceOverrides?: Record<string, ExperienceOverride>;
  outlineRows: TourOutlineDay[];
  markupPct: number;
  leadId?: string;
  galleryPhotos?: GalleryPhoto[];
  hotelsCatalog?: Hotel[];
  templateOverrides: ProposalTemplateOverrides;
  specialNotes: string;
  hotelRates: ProposalHotelRatesPersist | null;
  onTemplateOverridesChange: (overrides: ProposalTemplateOverrides) => void;
  onSpecialNotesChange: (notes: string) => void;
  onHotelRatesChange: (rates: ProposalHotelRatesPersist) => void;
  onReset: () => void;
  onBack: () => void;
}

export default function ProposalExportStep({
  brief,
  clientType,
  customerName,
  selectedProducts,
  selectedCodes,
  selectedPackageId,
  experienceOverrides = {},
  outlineRows,
  markupPct,
  leadId,
  galleryPhotos = [],
  hotelsCatalog = [],
  templateOverrides,
  specialNotes,
  hotelRates,
  onTemplateOverridesChange,
  onSpecialNotesChange,
  onHotelRatesChange,
  onReset,
  onBack,
}: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const hotelRateSeed = useMemo(() => {
    const optionA = extractHotelBlocksFromOutline(brief, outlineRows);
    return {
      optionA,
      optionB: seedOptionBHotelRates(optionA, hotelsCatalog),
    };
  }, [brief, outlineRows, hotelsCatalog]);
  const hotelRateSeedKey = useMemo(() => JSON.stringify(hotelRateSeed), [hotelRateSeed]);

  const hotelRatesOptionA =
    hotelRates && (!hotelRates.seedKey || hotelRates.seedKey === hotelRateSeedKey)
      ? hotelRates.optionA
      : hotelRateSeed.optionA;
  const hotelRatesOptionB =
    hotelRates && (!hotelRates.seedKey || hotelRates.seedKey === hotelRateSeedKey)
      ? hotelRates.optionB
      : hotelRateSeed.optionB;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const prevHotelSeedKeyRef = useRef(hotelRateSeedKey);

  useEffect(() => {
    if (prevHotelSeedKeyRef.current === hotelRateSeedKey) return;
    prevHotelSeedKeyRef.current = hotelRateSeedKey;
    onHotelRatesChange({
      optionA: hotelRateSeed.optionA,
      optionB: hotelRateSeed.optionB,
      seedKey: hotelRateSeedKey,
    });
  }, [hotelRateSeedKey, hotelRateSeed, onHotelRatesChange]);

  // Drop stale persisted rates when seed fingerprint no longer matches.
  useEffect(() => {
    if (!hotelRates?.seedKey) return;
    if (hotelRates.seedKey === hotelRateSeedKey) return;
    onHotelRatesChange({
      optionA: hotelRateSeed.optionA,
      optionB: hotelRateSeed.optionB,
      seedKey: hotelRateSeedKey,
    });
  }, [hotelRates, hotelRateSeedKey, hotelRateSeed, onHotelRatesChange]);

  const updateHotelRatesA = useCallback(
    (next: ProposalHotelRate[]) => {
      onHotelRatesChange({ optionA: next, optionB: hotelRatesOptionB, seedKey: hotelRateSeedKey });
    },
    [hotelRatesOptionB, hotelRateSeedKey, onHotelRatesChange]
  );

  const updateHotelRatesB = useCallback(
    (next: ProposalHotelRate[]) => {
      onHotelRatesChange({ optionA: hotelRatesOptionA, optionB: next, seedKey: hotelRateSeedKey });
    },
    [hotelRatesOptionA, hotelRateSeedKey, onHotelRatesChange]
  );

  const assembledDoc: ProposalDoc = useMemo(
    () =>
      assembleProposalDoc({
        brief,
        clientType,
        customerName,
        outlineRows,
        products: selectedProducts,
        selectedCodes,
        selectedPackageId,
        markupPct,
        leadId,
        hotelRatesOptionA,
        hotelRatesOptionB,
        specialNotesOverride: specialNotes || undefined,
        logoUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Logo-3.svg`,
        galleryPhotos,
        hotelsCatalog,
        experienceOverrides,
      }),
    [
      brief,
      clientType,
      customerName,
      outlineRows,
      selectedProducts,
      selectedCodes,
      selectedPackageId,
      markupPct,
      leadId,
      hotelRatesOptionA,
      hotelRatesOptionB,
      specialNotes,
      galleryPhotos,
      hotelsCatalog,
      experienceOverrides,
    ]
  );

  const proposalDoc = useMemo(
    () => applyProposalContentOverrides(assembledDoc, templateOverrides),
    [assembledDoc, templateOverrides]
  );

  const hasEdits = hasProposalTemplateOverrides(templateOverrides);

  const previewHtml = useMemo(
    () => buildProposalHTML(proposalDoc, typeof window !== 'undefined' ? window.location.origin : ''),
    [proposalDoc]
  );

  const hasContent = selectedProducts.length > 0 || selectedPackageId || outlineRows.length > 0;

  const downloadPdf = useCallback(async () => {
    if (!hasContent) {
      toast.warning('Please add tour content before exporting.');
      return;
    }
    setPdfLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalDoc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalDoc.quoteRef}-${(proposalDoc.customerName || 'proposal').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(formatPdfDownloadError(e instanceof Error ? e.message : 'PDF export failed.'));
    } finally {
      setPdfLoading(false);
    }
  }, [hasContent, proposalDoc]);

  /** Open Puppeteer PDF in a new tab for print — avoids browser date/URL/title chrome. */
  const printViaPdf = useCallback(async () => {
    if (!hasContent) {
      toast.warning('Please add tour content before printing.');
      return;
    }
    setPdfLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalDoc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        URL.revokeObjectURL(url);
        throw new Error('Popup blocked. Allow popups for this site, then print from the generated PDF tab.');
      }
      // Revoke after the viewer has loaded the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(formatPdfDownloadError(e instanceof Error ? e.message : 'PDF print failed.'));
    } finally {
      setPdfLoading(false);
    }
  }, [hasContent, proposalDoc]);

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">Step 5 — Export Proposal ✦</span>
        <span style={{ fontSize: 11, color: 'var(--m)' }}>
          {clientType === 'b2b' ? 'B2B Net Quotation' : 'B2C Client Proposal'} · {proposalDoc.quoteRef}
        </span>
      </div>
      <div className="card-body">
        <div className="td-proposal-export-bar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="btn btn-p" type="button" onClick={downloadPdf} disabled={pdfLoading || !hasContent}>
            {pdfLoading ? 'Generating PDF…' : '📄 Download PDF'}
          </button>
          <button
            className="btn btn-s"
            type="button"
            onClick={() => void printViaPdf()}
            disabled={pdfLoading || !hasContent}
          >
            🖨 Print / Save PDF
          </button>
          <button
            className="btn btn-s"
            type="button"
            onClick={() => downloadProposalWord(proposalDoc, window.location.origin)}
            disabled={!hasContent}
          >
            📝 Download Word
          </button>
          <button className="btn btn-s" type="button" onClick={() => setPreviewOpen((v) => !v)} disabled={!hasContent}>
            {previewOpen ? 'Hide Preview' : '👁 Preview Proposal'}
          </button>
          <button className="btn btn-s" type="button" onClick={() => setEditorOpen(true)} disabled={!hasContent}>
            ✏️ Edit Template{hasEdits ? ' •' : ''}
          </button>
        </div>

        {!hasContent && (
          <div style={{ padding: 12, background: 'var(--amb-l)', borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>
            Add experiences (Step 3), a package, or outline days before exporting a proposal.
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label className="lbl" style={{ display: 'block', marginBottom: 4 }}>
            Special Notes (shown on proposal)
          </label>
          <textarea
            rows={2}
            value={specialNotes}
            onChange={(e) => onSpecialNotesChange(e.target.value)}
            placeholder={brief.specialRequests || 'Dietary, accessibility, pace, occasion…'}
            style={{ width: '100%', fontSize: 12.5 }}
          />
        </div>

        {clientType === 'b2b' && (
          <div style={{ marginBottom: 16 }}>
            <ProposalHotelRatesPanel
              title="C. HOTELS — OPTION A (4★) — enter net rate per night"
              rates={hotelRatesOptionA}
              onChange={updateHotelRatesA}
            />
            <ProposalHotelRatesPanel
              title="C. HOTELS — OPTION B (5★ Luxury) — enter hotel names & net rates"
              rates={hotelRatesOptionB}
              onChange={updateHotelRatesB}
              editableHotelName
              emptyHint="Option B rows appear once Outline hotels are detected (same stays as Option A)."
            />
          </div>
        )}

        {previewOpen && (
          <div
            className="td-proposal-preview"
            style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}
          >
            <iframe
              title="Proposal preview"
              srcDoc={previewHtml}
              style={{ width: '100%', height: 480, border: 'none', background: '#fff' }}
            />
          </div>
        )}

        <ProposalEditorModal
          open={editorOpen}
          doc={assembledDoc}
          overrides={templateOverrides}
          origin={typeof window !== 'undefined' ? window.location.origin : ''}
          onClose={() => setEditorOpen(false)}
          onSave={(next) => {
            onTemplateOverridesChange(next);
            setPreviewOpen(true);
          }}
        />

        {error && (
          <div className="td-ai-error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}

        <div className="td-nav" style={{ marginTop: 16 }}>
          <button className="btn btn-s" type="button" onClick={onBack}>
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-s" type="button" onClick={onReset}>
              + New Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
