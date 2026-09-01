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
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
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

  const { language, tp, tpl, tc } = useLanguage();
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

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
      toast.success(tpl('tour-design', 'editorCompanySaved', { variant: variant.toUpperCase() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('tour-design', 'editorCompanySaveFailed'));
    }
  }

  if (!open) return null;

  const source = companySourceByVariant[variant];
  const variantLabel = variant === 'b2b' ? tp('tour-design', 'editorB2bLabel') : tp('tour-design', 'editorB2cLabel');
  const updating = previewHtml !== liveHtml;

  return (
    <div
      className="modal-overlay open"
      onClick={() => void requestClose()}
      role="presentation"
    >
      <div
        className="modal proposal-editor-modal proposal-doc-editor-modal proposal-template-editor-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${tp('tour-design', 'editorTitle')} — ${variantLabel}`}
      >
        <div className="modal-hd modal-hd-green proposal-template-hd">
          <div className="proposal-template-hd-main">
            <span className="proposal-template-hd-title">{tp('tour-design', 'editorTitle')}</span>
            <span className="proposal-template-meta">
              <span className="td-export-pill is-ready">{variantLabel}</span>
              {doc.quoteRef ? (
                <span className="proposal-template-quote-ref">{doc.quoteRef}</span>
              ) : null}
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="proposal-template-banner proposal-template-banner--compact">
          <div className="proposal-template-meta">
            <span className="td-export-pill">{tp('tour-design', 'editorLockedPill')}</span>
            <span className={`td-export-pill${source === 'company' ? ' is-ready' : ''}`}>
              {source === 'company' ? tp('tour-design', 'exportCompanyTemplate') : tp('tour-design', 'exportSystemDefaults')}
            </span>
            {dirty ? <span className="td-export-pill is-busy">{tp('tour-design', 'editorUnsaved')}</span> : null}
          </div>
          <details className="proposal-template-help">
            <summary>{tp('tour-design', 'editorHowItWorks')}</summary>
            <p>
              {tpl('tour-design', 'editorHowItWorksBody', { variant: variant.toUpperCase() })}
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
              title={tp('tour-design', 'editorPreviewTitle')}
              iframeRef={iframeRef}
              onIframeLoad={handleIframeLoad}
              leading={
                <>
                  <strong>{variantLabel}</strong>
                  <span className="td-export-preview-meta">{tp('tour-design', 'exportPreviewLive')}</span>
                </>
              }
              status={
                <span className={`td-export-pill${updating ? ' is-busy' : ' is-ready'}`}>
                  {updating ? tp('tour-design', 'exportPreviewUpdating') : tp('tour-design', 'exportPreviewUpdated')}
                </span>
              }
            />
          </div>
        </div>

        <div className="proposal-editor-footer">
          <button type="button" className="proposal-template-link" onClick={handleResetSystem}>
            {tp('tour-design', 'editorResetSystem')}
          </button>
          <div style={{ flex: 1 }} />
          {dirty ? <span className="td-export-pill is-busy">{tp('tour-design', 'editorUnsaved')}</span> : null}
          <button type="button" className="btn btn-s" onClick={() => void requestClose()}>
            {tc('cancel')}
          </button>
          <button type="button" className="btn btn-s" onClick={handleSaveQuote}>
            {tp('tour-design', 'editorApplyQuote')}
          </button>
          <button
            type="button"
            className="btn btn-p"
            disabled={savingCompany}
            onClick={() => void handleSaveCompany()}
          >
            {savingCompany ? tp('tour-design', 'editorSaving') : tp('tour-design', 'editorSaveCompany')}
          </button>
        </div>
      </div>
    </div>
  );
}
