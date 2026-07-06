'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { stripMarkdown } from '@/lib/tour-itinerary';
import { paxToTierN, sumSellForProducts } from '@/lib/tour-pricing';
import { assembleProposalDoc, extractHotelBlocksFromOutline } from '@/lib/proposal-assembler';
import { buildProposalHTML, downloadProposalWord, printProposal } from '@/lib/proposal-html';
import type { TourBrief } from '@/lib/tour-design-types';
import type { Product, TourOutlineDay } from '@/lib/types';
import type { ProposalDoc, ProposalHotelRate } from '@/lib/proposal-types';
import ProposalHotelRatesPanel from '@/components/tourdesign/ProposalHotelRatesPanel';

const API_KEY_STORAGE = 'ant_api_key';

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
  outlineRows: TourOutlineDay[];
  markupPct: number;
  leadId?: string;
  onSavePipeline: () => void;
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
  outlineRows,
  markupPct,
  leadId,
  onSavePipeline,
  onReset,
  onBack,
}: Props) {
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('No API key saved yet.');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [showCopy, setShowCopy] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [hotelRates, setHotelRates] = useState<ProposalHotelRate[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem(API_KEY_STORAGE) || '';
    setApiKey(k);
    setKeyStatus(k ? '✓ API key saved on this device.' : 'No API key saved yet.');
  }, []);

  useEffect(() => {
    setHotelRates(extractHotelBlocksFromOutline(brief, outlineRows));
  }, [brief, outlineRows]);

  const proposalDoc: ProposalDoc = useMemo(
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
        hotelRates,
        specialNotesOverride: specialNotes || undefined,
        logoUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Logo-3.svg`,
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
      hotelRates,
      specialNotes,
    ]
  );

  const previewHtml = useMemo(
    () => buildProposalHTML(proposalDoc, typeof window !== 'undefined' ? window.location.origin : ''),
    [proposalDoc]
  );

  const hasContent = selectedProducts.length > 0 || selectedPackageId || outlineRows.length > 0;

  function saveKey() {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
    setKeyStatus(apiKey.trim() ? '✓ API key saved on this device.' : 'No API key saved yet.');
  }

  function clearKey() {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    setKeyStatus('No API key saved yet.');
  }

  async function aiExport(type: 'proposal' | 'email') {
    if (!hasContent) {
      alert('Please add experiences, select a package, or build an outline first.');
      return;
    }

    const codes = selectedProducts.map((p) => p.code);
    const tierN = paxToTierN(brief.pax);
    const sellPerPax = sumSellForProducts(codes, tierN, markupPct) || (proposalDoc.pricing.kind === 'b2c' ? proposalDoc.pricing.perPerson : 0);
    const groupTotal = sellPerPax * brief.pax;
    const expList = selectedProducts.map((p) => `- ${p.name} (${p.dur}): ${stripMarkdown(p.desc).slice(0, 120)}…`).join('\n');
    const special = specialNotes || brief.specialRequests || brief.notes || 'None';

    let prompt = '';
    if (type === 'proposal') {
      prompt = `You are the luxury travel writer for The Ant Adventures. Write a professional client-ready tour proposal.

CLIENT: ${brief.clientName || customerName || 'the client'} · ${brief.pax} pax · ${brief.style} · ${brief.hotelTier}
TRAVEL: ${proposalDoc.travelDateRange} · LANGUAGE: ${brief.language}
SPECIAL: ${special}
SELL: $${fmt(sellPerPax)}/pax · GROUP: $${fmt(groupTotal)}

EXPERIENCES:
${expList || '(from package/outline)'}

Write: TOUR TITLE, TAGLINE, OVERVIEW, KEY HIGHLIGHTS, INCLUSIONS, PRICING table. Second person, sensory, unhurried tone.`;
    } else {
      prompt = `Write a warm proposal email for The Ant Adventures.

CLIENT: ${customerName} · ${clientType === 'b2b' ? 'B2B Agent' : 'B2C'} · ${brief.pax} pax
DATES: ${proposalDoc.travelDateRange} · TIER: ${brief.hotelTier}
PRICING: $${fmt(sellPerPax)}/pax · Group $${fmt(groupTotal)}

Include subject line, body, sign-off from ${proposalDoc.consultant.name}.`;
    }

    setLoading(true);
    setError('');
    setResult('');
    setShowCopy(false);

    const key = localStorage.getItem(API_KEY_STORAGE) || '';
    if (!key.startsWith('sk-')) {
      setLoading(false);
      setError('⚡ API key required. Enter your Anthropic API key above and click Save Key.');
      return;
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'API request failed.');
        return;
      }
      const text =
        data.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') ||
        'No response.';
      setResult(text);
      setShowCopy(true);
    } catch {
      setError('Network error — check your connection and API key.');
    } finally {
      setLoading(false);
    }
  }

  const downloadPdf = useCallback(async () => {
    if (!hasContent) {
      alert('Please add tour content before exporting.');
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

  function copyResult() {
    if (result) navigator.clipboard.writeText(result);
  }

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
            onClick={() => printProposal(proposalDoc, window.location.origin)}
            disabled={!hasContent}
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
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder={brief.specialRequests || 'Dietary, accessibility, pace, occasion…'}
            style={{ width: '100%', fontSize: 12.5 }}
          />
        </div>

        {clientType === 'b2b' && (
          <div style={{ marginBottom: 16 }}>
            <ProposalHotelRatesPanel rates={hotelRates} onChange={setHotelRates} />
          </div>
        )}

        {previewOpen && (
          <div className="td-proposal-preview" style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <iframe
              title="Proposal preview"
              srcDoc={previewHtml}
              style={{ width: '100%', height: 480, border: 'none', background: '#fff' }}
            />
          </div>
        )}

        <div className="td-api-key-banner">
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pur)', marginBottom: 3 }}>⚡ Anthropic API Key (optional — AI narrative)</div>
            <div style={{ fontSize: 11.5, color: '#4a1460' }}>Required only for AI Itinerary / Quote Email below.</div>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ padding: '7px 11px', border: '1.5px solid var(--pur)', borderRadius: 7, fontFamily: 'monospace', fontSize: 12, width: 280 }}
            />
            <button className="btn btn-pu btn-sm" type="button" onClick={saveKey}>
              Save Key
            </button>
            <button type="button" onClick={clearKey} style={{ background: 'none', border: 'none', color: 'var(--m)', fontSize: 11, cursor: 'pointer' }}>
              Clear
            </button>
          </div>
          <div style={{ fontSize: 11.5, marginTop: 8, color: 'var(--m)', width: '100%' }}>{keyStatus}</div>
        </div>

        <div className="td-export-grid">
          <div className="td-export-card td-export-proposal" onClick={() => aiExport('proposal')} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g)' }}>AI Itinerary Narrative</div>
            <div style={{ fontSize: 11.5, color: 'var(--gd)', marginTop: 4 }}>Optional luxury copy to paste into outline or email</div>
          </div>
          <div className="td-export-card td-export-email" onClick={() => aiExport('email')} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✉️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92711d' }}>Quote Email</div>
            <div style={{ fontSize: 11.5, color: '#92711d', marginTop: 4 }}>AI drafts personalized B2C/B2B proposal email</div>
          </div>
          <div className="td-export-card td-export-save" onClick={onSavePipeline} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m)' }}>Save to Pipeline</div>
            <div style={{ fontSize: 11.5, color: 'var(--m)', marginTop: 4 }}>Add to Sales CRM as Designing-stage lead</div>
          </div>
        </div>

        {loading && (
          <div className="td-ai-loading">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}

        {error && <div className="td-ai-error" style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}

        {result && (
          <div className="td-ai-result">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{result}</pre>
          </div>
        )}

        <div className="td-nav" style={{ marginTop: 16 }}>
          <button className="btn btn-s" type="button" onClick={onBack}>
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {showCopy && (
              <button className="btn btn-s" type="button" onClick={copyResult}>
                📋 Copy Result
              </button>
            )}
            <button className="btn btn-s" type="button" onClick={onReset}>
              + New Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
