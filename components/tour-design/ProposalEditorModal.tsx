'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  defaultCompanyTemplate,
  hydrateTemplateForm,
  mergeProposalTemplateLayers,
  serializeCompanyTemplate,
  type CompanyTemplateSource,
} from '@/lib/proposals/proposal-company-template';
import type { ProposalTemplateOverrides } from '@/lib/proposals/proposal-content-overrides';
import { buildProposalHTML } from '@/lib/proposals/proposal-html';
import type { ProposalDoc, ProposalVariant } from '@/lib/proposals/proposal-types';
import { toast } from '@/lib/toast';
import ProposalDocumentCanvas from '@/components/tour-design/ProposalDocumentCanvas';
import ProposalTemplateForm from '@/components/tour-design/ProposalTemplateForm';

interface Props {
  open: boolean;
  doc: ProposalDoc;
  companyByVariant: Record<ProposalVariant, ProposalTemplateOverrides>;
  companySourceByVariant: Record<ProposalVariant, CompanyTemplateSource>;
  origin?: string;
  savingCompany?: boolean;
  onSaveQuote: (overrides: ProposalTemplateOverrides) => void;
  onSaveCompany: (variant: ProposalVariant, fields: ProposalTemplateOverrides) => Promise<void>;
  onClose: () => void;
}

function seedDraft(
  companyByVariant: Record<ProposalVariant, ProposalTemplateOverrides>,
  doc: ProposalDoc
): ProposalTemplateOverrides {
  return hydrateTemplateForm(doc.variant, companyByVariant[doc.variant], doc);
}

function scrollPreviewToAnchor(iDoc: Document, anchorId: string): void {
  const escaped =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(anchorId) : anchorId;
  const el = iDoc.querySelector(`[data-template-anchor="${escaped}"]`);
  if (!(el instanceof iDoc.defaultView!.HTMLElement)) return;
  iDoc.querySelectorAll('.proposal-anchor-flash').forEach((node) => {
    node.classList.remove('proposal-anchor-flash');
  });
  el.classList.add('proposal-anchor-flash');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function stableSnapshot(fields: ProposalTemplateOverrides): string {
  return JSON.stringify(serializeCompanyTemplate(fields));
}

export default function ProposalEditorModal({
  open,
  doc,
  companyByVariant,
  companySourceByVariant,
  origin = '',
  savingCompany = false,
  onSaveQuote,
  onSaveCompany,
  onClose,
}: Props) {
  const variant = doc.variant;
  const [draft, setDraft] = useState<ProposalTemplateOverrides>(() => seedDraft(companyByVariant, doc));
  const [seedSnapshot, setSeedSnapshot] = useState(() =>
    stableSnapshot(seedDraft(companyByVariant, doc))
  );
  const wasOpenRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingAnchorRef = useRef<string | null>(null);
  const flashTimerRef = useRef<number>(0);
  const highlightTimerRef = useRef<number>(0);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const next = seedDraft(companyByVariant, doc);
      setDraft(next);
      setSeedSnapshot(stableSnapshot(next));
    }
    wasOpenRef.current = open;
  }, [open, doc, companyByVariant]);

  const liveHtml = useMemo(() => {
    const previewDoc = mergeProposalTemplateLayers(doc, draft);
    return buildProposalHTML(previewDoc, origin, { preview: true });
  }, [doc, draft, origin]);

  const [previewHtml, setPreviewHtml] = useState(liveHtml);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPreviewHtml(liveHtml);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewHtml(liveHtml), 280);
    return () => window.clearTimeout(timer);
  }, [liveHtml]);

  const dirty = stableSnapshot(draft) !== seedSnapshot;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function applyAnchor(anchorId: string) {
    const iDoc = iframeRef.current?.contentDocument;
    if (!iDoc?.body) return;
    scrollPreviewToAnchor(iDoc, anchorId);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      iDoc.querySelectorAll('.proposal-anchor-flash').forEach((node) => {
        node.classList.remove('proposal-anchor-flash');
      });
    }, 1200);
  }

  function handleFocusAnchor(anchorId: string) {
    pendingAnchorRef.current = anchorId;
    window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => applyAnchor(anchorId), 80);
  }

  function handleIframeLoad() {
    const anchor = pendingAnchorRef.current;
    if (anchor) applyAnchor(anchor);
  }

  function handleResetSystem() {
    const next = defaultCompanyTemplate(variant);
    setDraft(next);
  }

  function handleSaveQuote() {
    onSaveQuote(serializeCompanyTemplate(draft));
    onClose();
  }

  async function handleSaveCompany() {
    try {
      await onSaveCompany(variant, serializeCompanyTemplate(draft));
      setSeedSnapshot(stableSnapshot(draft));
      toast.success(`${variant.toUpperCase()} company template saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save company template');
    }
  }

  if (!open) return null;

  const source = companySourceByVariant[variant];
  const variantLabel = variant === 'b2b' ? 'B2B quotation' : 'B2C proposal';
  const updating = previewHtml !== liveHtml;

  return (
    <div
      className="modal-overlay open"
      onClick={() => {
        if (!dirty) onClose();
      }}
      role="presentation"
    >
      <div
        className="modal proposal-editor-modal proposal-doc-editor-modal proposal-template-editor-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit Template — ${variantLabel}`}
      >
        <div className="modal-hd modal-hd-green proposal-template-hd">
          <div className="proposal-template-hd-main">
            <span className="proposal-template-hd-title">Edit Template</span>
            <span className="proposal-template-meta">
              <span className="td-export-pill is-ready">{variantLabel}</span>
              {doc.quoteRef ? (
                <span className="proposal-template-quote-ref">{doc.quoteRef}</span>
              ) : null}
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="proposal-template-banner proposal-template-banner--compact">
          <div className="proposal-template-meta">
            <span className="td-export-pill">Layout · itinerary · prices locked</span>
            <span className={`td-export-pill${source === 'company' ? ' is-ready' : ''}`}>
              {source === 'company' ? 'Company template' : 'System defaults'}
            </span>
            {dirty ? <span className="td-export-pill is-busy">Unsaved changes</span> : null}
          </div>
          <details className="proposal-template-help">
            <summary>How this works</summary>
            <p>
              Click a field to jump to it in the preview. Save as the company template (all future{' '}
              {variant.toUpperCase()} tours) or apply to this quote only. Layout, itinerary, guest
              names, and prices stay locked.
            </p>
          </details>
        </div>

        <div className="proposal-template-workspace">
          <div className="proposal-template-form-col">
            <ProposalTemplateForm
              variant={variant}
              value={draft}
              onChange={setDraft}
              onFocusAnchor={handleFocusAnchor}
            />
          </div>
          <div className="proposal-template-preview-col">
            <ProposalDocumentCanvas
              html={previewHtml}
              title="Proposal template preview"
              iframeRef={iframeRef}
              onIframeLoad={handleIframeLoad}
              leading={
                <>
                  <strong>{variantLabel}</strong>
                  <span className="td-export-preview-meta">· live</span>
                </>
              }
              status={
                <span className={`td-export-pill${updating ? ' is-busy' : ' is-ready'}`}>
                  {updating ? 'Updating…' : 'Updated'}
                </span>
              }
            />
          </div>
        </div>

        <div className="proposal-editor-footer">
          <button type="button" className="proposal-template-link" onClick={handleResetSystem}>
            Reset to system defaults
          </button>
          <div style={{ flex: 1 }} />
          {dirty ? <span className="td-export-pill is-busy">Unsaved changes</span> : null}
          <button type="button" className="btn btn-s" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-s" onClick={handleSaveQuote}>
            Apply to this quote
          </button>
          <button
            type="button"
            className="btn btn-p"
            disabled={savingCompany}
            onClick={() => void handleSaveCompany()}
          >
            {savingCompany ? 'Saving…' : 'Save company template'}
          </button>
        </div>
      </div>
    </div>
  );
}
