'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_DURATIONS,
  PRODUCT_LEVELS,
} from '@/lib/products/product-form';
import { parsePortfolioFile } from '@/lib/products/portfolio-xlsx';
import type { PortfolioDraftProduct } from '@/lib/products/portfolio-classify';
import { replaceCatalogueFromDrafts } from '@/lib/products/replace-catalogue';
import { confirmDialog } from '@/lib/confirm';
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

const REGIONS = [
  { value: 'south', label: 'South' },
  { value: 'north', label: 'North' },
  { value: 'central', label: 'Central' },
  { value: 'services', label: 'Services' },
] as const;

interface PortfolioImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

export default function PortfolioImportModal({ open, onClose, onImported }: PortfolioImportModalProps) {
  const { tp, tpl, tc, language } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<PortfolioDraftProduct[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);

  const reviewCount = useMemo(() => drafts.filter((d) => d.needsReview).length, [drafts]);

  const reset = useCallback(() => {
    setDrafts([]);
    setWarnings([]);
    setSheetName('');
    setFileName('');
    setParseError(null);
    setImportError(null);
    setReviewOnly(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const dirty = drafts.length > 0 || fileName.length > 0;
  const finishClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);
  const { requestClose } = useConfirmClose({
    open,
    dirty,
    onClose: finishClose,
    disabled: busy,
    language,
  });

  const visible = useMemo(
    () => (reviewOnly ? drafts.filter((d) => d.needsReview) : drafts),
    [drafts, reviewOnly]
  );

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setParseError(null);
    setImportError(null);
    try {
      const result = await parsePortfolioFile(file);
      setDrafts(result.products);
      setWarnings(result.warnings);
      setSheetName(result.sheetName);
      setFileName(file.name);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : tp('products', 'errorParseFailed'));
      setDrafts([]);
    } finally {
      setBusy(false);
    }
  };

  const patchDraft = (code: string, patch: Partial<PortfolioDraftProduct>) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.code !== code) return d;
        const next = { ...d, ...patch };
        const reasons = [...next.reviewReasons];
        if (patch.dest !== undefined && patch.dest.trim()) {
          const i = reasons.findIndex((r) => /destination/i.test(r));
          if (i >= 0) reasons.splice(i, 1);
        }
        if (patch.cat !== undefined) {
          const i = reasons.findIndex((r) => /category/i.test(r));
          if (i >= 0) reasons.splice(i, 1);
        }
        if (patch.dur !== undefined) {
          const i = reasons.findIndex((r) => /duration/i.test(r));
          if (i >= 0) reasons.splice(i, 1);
        }
        next.reviewReasons = reasons;
        next.needsReview = reasons.length > 0;
        return next;
      })
    );
  };

  const handleImport = async () => {
    if (!drafts.length) return;
    const ok = await confirmDialog(
      tpl('products', 'importConfirmBody', { count: drafts.length }),
      {
        title: tp('products', 'importConfirmTitle'),
        confirmLabel: tp('products', 'importConfirmLabel'),
        danger: true,
      },
    );
    if (!ok) return;

    setBusy(true);
    setImportError(null);
    const result = await replaceCatalogueFromDrafts(drafts);
    setBusy(false);

    if (!result.ok) {
      setImportError(result.error || tp('products', 'errorImportFailed'));
      return;
    }

    onImported(result.imported);
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="overlay open prod-form-overlay" onClick={() => void requestClose()}>
      <div
        className="modal prod-form-modal portfolio-import-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="portfolio-import-title"
      >
        <div className="modal-hd modal-hd-green prod-form-modal-hd">
          <div>
            <div id="portfolio-import-title" className="prod-form-modal-title">
              {tp('products', 'importTitle')}
            </div>
            <div className="prod-form-modal-sub">{tp('products', 'importSubtitle')}</div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => void requestClose()}
            disabled={busy}
            aria-label={tp('products', 'importCloseAria')}
          >
            ✕
          </button>
        </div>

        <div className="prod-form-modal-bd">
          <div className="portfolio-import-toolbar">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            {fileName && (
              <span className="portfolio-import-meta">
                {fileName}
                {sheetName ? ` · sheet “${sheetName}”` : ''} · {drafts.length} products
                {reviewCount > 0 ? ` · ${reviewCount} need review` : ''}
              </span>
            )}
            {drafts.length > 0 && (
              <label className="portfolio-import-filter">
                <input
                  type="checkbox"
                  checked={reviewOnly}
                  onChange={(e) => setReviewOnly(e.target.checked)}
                />
                Show review-only
              </label>
            )}
          </div>

          {parseError && <div className="portfolio-import-error">{parseError}</div>}
          {importError && <div className="portfolio-import-error">{importError}</div>}

          {warnings.length > 0 && (
            <details className="portfolio-import-warnings">
              <summary>{warnings.length} parse warning(s)</summary>
              <ul>
                {warnings.slice(0, 40).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 40 && <li>…and {warnings.length - 40} more</li>}
              </ul>
            </details>
          )}

          {drafts.length === 0 && !parseError && (
            <p className="portfolio-import-empty">{tp('products', 'importChooseHint')}</p>
          )}

          {visible.length > 0 && (
            <div className="portfolio-import-table-wrap">
              <table className="portfolio-import-table">
                <thead>
                  <tr>
                    <th>{tp('products', 'importColCode')}</th>
                    <th>{tp('products', 'importColName')}</th>
                    <th>{tp('products', 'importColRegion')}</th>
                    <th>{tp('products', 'importColDest')}</th>
                    <th>{tp('products', 'importColCat')}</th>
                    <th>{tp('products', 'importColDuration')}</th>
                    <th>{tp('products', 'importColNotes')}</th>
                    <th>{tp('products', 'importColFlags')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d) => (
                    <tr key={d.code} className={d.needsReview ? 'needs-review' : undefined}>
                      <td className="mono">{d.code}</td>
                      <td className="portfolio-import-name" title={d.name}>
                        {d.name}
                      </td>
                      <td>
                        <select
                          value={d.region}
                          onChange={(e) => patchDraft(d.code, { region: e.target.value })}
                          disabled={busy}
                        >
                          {REGIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={d.dest}
                          onChange={(e) => patchDraft(d.code, { dest: e.target.value })}
                          disabled={busy}
                        />
                      </td>
                      <td>
                        <select
                          value={d.cat}
                          onChange={(e) => patchDraft(d.code, { cat: e.target.value })}
                          disabled={busy}
                        >
                          {PRODUCT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          {!PRODUCT_CATEGORIES.includes(d.cat as (typeof PRODUCT_CATEGORIES)[number]) && (
                            <option value={d.cat}>{d.cat}</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <select
                          value={
                            PRODUCT_DURATIONS.includes(d.dur as (typeof PRODUCT_DURATIONS)[number])
                              ? d.dur
                              : '__custom__'
                          }
                          onChange={(e) => {
                            if (e.target.value !== '__custom__') {
                              patchDraft(d.code, { dur: e.target.value });
                            }
                          }}
                          disabled={busy}
                        >
                          {PRODUCT_DURATIONS.map((dur) => (
                            <option key={dur} value={dur}>
                              {dur}
                            </option>
                          ))}
                          {!PRODUCT_DURATIONS.includes(d.dur as (typeof PRODUCT_DURATIONS)[number]) && (
                            <option value="__custom__">{d.dur}</option>
                          )}
                        </select>
                      </td>
                      <td className="portfolio-import-notes" title={d.notesToSales}>
                        {d.notesToSales.slice(0, 80)}
                        {d.notesToSales.length > 80 ? '…' : ''}
                      </td>
                      <td>
                        {d.needsReview ? (
                          <span className="bdg bdg-a" title={d.reviewReasons.join('; ')}>
                            {tp('products', 'flagReview')}
                          </span>
                        ) : (
                          <span className="bdg bdg-g">{tp('products', 'flagOk')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {drafts.length > 0 && (
            <p className="portfolio-import-hint">
              Level defaults to {PRODUCT_LEVELS[0]}. USP / logic stay empty. After import, empty pricing rows are
              created for every product (linked by code) — enter sell/cost later in Pricing. Required service codes
              (e-visa, airport fast track) are kept if missing from the file.
            </p>
          )}
        </div>

        <div className="prod-form-modal-ft">
          <button type="button" className="btn btn-s" onClick={() => void requestClose()} disabled={busy}>
            {tc('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-p"
            disabled={busy || drafts.length === 0}
            onClick={() => void handleImport()}
          >
            {busy
              ? tp('products', 'importWorking')
              : tpl('products', 'importReplaceCatalogue', { count: drafts.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
