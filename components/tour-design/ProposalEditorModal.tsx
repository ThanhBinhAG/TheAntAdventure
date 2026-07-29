'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyProposalContentOverrides,
  hasProposalContentOverrides,
  snapshotFromDoc,
  type ProposalContentOverrides,
} from '@/lib/proposals/proposal-content-overrides';
import { harvestOverridesFromRoot } from '@/lib/proposals/proposal-editable-harvest';
import { buildProposalEditableHTML } from '@/lib/proposals/proposal-html';
import type { ProposalDoc } from '@/lib/proposals/proposal-types';

interface Props {
  open: boolean;
  doc: ProposalDoc;
  overrides: ProposalContentOverrides;
  origin?: string;
  onSave: (overrides: ProposalContentOverrides) => void;
  onClose: () => void;
}

export default function ProposalEditorModal({ open, doc, overrides, origin = '', onSave, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const draftRef = useRef<ProposalContentOverrides>({});
  const [richActive, setRichActive] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const [previousOpen, setPreviousOpen] = useState(open);

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setRichActive(false);
  }

  const initialDoc = useMemo(
    () => applyProposalContentOverrides(doc, hasProposalContentOverrides(overrides) ? overrides : null),
    [doc, overrides]
  );

  const srcDoc = useMemo(
    () => buildProposalEditableHTML(initialDoc, origin),
    [initialDoc, origin]
  );

  useEffect(() => {
    if (open) {
      draftRef.current = hasProposalContentOverrides(overrides) ? { ...overrides } : snapshotFromDoc(doc);
    }
  }, [open, doc, overrides]);

  const harvestFromIframe = useCallback(() => {
    const iDoc = iframeRef.current?.contentDocument;
    if (!iDoc?.body) return;
    draftRef.current = harvestOverridesFromRoot(iDoc.body, initialDoc);
  }, [initialDoc]);

  const runCmd = useCallback(
    (cmd: string, val?: string) => {
      const iDoc = iframeRef.current?.contentDocument;
      if (!iDoc) return;
      iDoc.execCommand(cmd, false, val);
      harvestFromIframe();
    },
    [harvestFromIframe]
  );

  useEffect(() => {
    if (!open) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    function bind() {
      const iDoc = iframe?.contentDocument;
      if (!iDoc?.body) return;

      const onInput = () => harvestFromIframe();
      const onSelectionChange = () => {
        const sel = iDoc.getSelection();
        if (!sel?.anchorNode) {
          setRichActive(false);
          return;
        }
        let node: Node | null = sel.anchorNode;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const rich = (node as Element | null)?.closest?.('[data-rich="1"]');
        setRichActive(!!rich);
      };

      iDoc.body.addEventListener('input', onInput);
      iDoc.addEventListener('selectionchange', onSelectionChange);
      iDoc.body.addEventListener('keyup', onSelectionChange);
      iDoc.body.addEventListener('mouseup', onSelectionChange);

      return () => {
        iDoc.body.removeEventListener('input', onInput);
        iDoc.removeEventListener('selectionchange', onSelectionChange);
        iDoc.body.removeEventListener('keyup', onSelectionChange);
        iDoc.body.removeEventListener('mouseup', onSelectionChange);
      };
    }

    const timer = window.setTimeout(() => {
      const cleanup = bind();
      if (cleanup) {
        iframe!.dataset.bound = '1';
      }
    }, 50);

    return () => {
      window.clearTimeout(timer);
      const iDoc = iframe?.contentDocument;
      if (iDoc?.body) {
        iDoc.body.replaceWith(iDoc.body.cloneNode(true));
      }
    };
  }, [open, resetRevision, harvestFromIframe]);

  function handleResetAll() {
    draftRef.current = snapshotFromDoc(doc);
    setResetRevision((revision) => revision + 1);
  }

  function handleSave() {
    harvestFromIframe();
    onSave(draftRef.current);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal proposal-editor-modal proposal-doc-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <span>Edit Proposal — click text to change</span>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="proposal-doc-toolbar">
          <span className="proposal-doc-toolbar-label">Format</span>
          <button
            type="button"
            className="proposal-rich-btn"
            title="Bold"
            disabled={!richActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCmd('bold')}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="proposal-rich-btn"
            title="Italic"
            disabled={!richActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCmd('italic')}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="proposal-rich-btn"
            title="Bullet list"
            disabled={!richActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCmd('insertUnorderedList')}
          >
            • List
          </button>
          <button
            type="button"
            className="proposal-rich-btn"
            title="Undo"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCmd('undo')}
          >
            ↶
          </button>
          <button
            type="button"
            className="proposal-rich-btn"
            title="Redo"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCmd('redo')}
          >
            ↷
          </button>
          {!richActive && (
            <span style={{ fontSize: 11, color: 'var(--m)', marginLeft: 8 }}>
              Select text in narrative fields for formatting
            </span>
          )}
        </div>

        <div className="proposal-doc-canvas">
          <iframe
            key={resetRevision}
            ref={iframeRef}
            title="Proposal document editor"
            srcDoc={srcDoc}
            className="proposal-doc-iframe"
          />
        </div>

        <div className="proposal-editor-footer">
          <button type="button" className="btn btn-s" onClick={handleResetAll}>
            Reset all
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-s" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={handleSave}>
            Save &amp; close
          </button>
        </div>
      </div>
    </div>
  );
}
