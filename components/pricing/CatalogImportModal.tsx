'use client';

import { useCallback, useRef, useState } from 'react';
import {
  replaceAccommodationCatalog,
  replaceEssentialsCatalog,
} from '@/lib/pricing/catalog-api';
import { parseAccommodationFile } from '@/lib/pricing/accommodation-xlsx';
import { parseEssentialsFile } from '@/lib/pricing/essentials-xlsx';
import type {
  AccommodationCatalog,
  CatalogParseResult,
  CatalogWorkbook,
  EssentialsCatalog,
} from '@/lib/pricing/catalog-types';
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

type ParsedEssentials = CatalogParseResult<EssentialsCatalog>;
type ParsedAccommodation = CatalogParseResult<AccommodationCatalog>;
type Parsed = ParsedEssentials | ParsedAccommodation;

interface Props {
  open: boolean;
  workbook: CatalogWorkbook;
  onClose: () => void;
  onImported: (rowCount: number) => void;
}

export default function CatalogImportModal({ open, workbook, onClose, onImported }: Props) {
  const { tp, language } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const titleKey = workbook === 'essentials' ? 'importEssentialsTitle' : 'importAccommodationTitle';
  const confirmKey = workbook === 'essentials' ? 'importConfirmEssentials' : 'importConfirmAccommodation';

  const reset = useCallback(() => {
    setParsed(null);
    setFileName('');
    setParseError(null);
    setImportError(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const dirty = parsed !== null || fileName.length > 0;
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

  if (!open) return null;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setParseError(null);
    setImportError(null);
    setConfirmed(false);
    try {
      const result =
        workbook === 'essentials' ? await parseEssentialsFile(file) : await parseAccommodationFile(file);
      setParsed(result);
      setFileName(file.name);
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : tp('pricing', 'importParseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!parsed || !confirmed) return;
    setBusy(true);
    setImportError(null);
    try {
      const meta = {
        fileName,
        sheetCount: parsed.sheets.length,
        warningCount: parsed.warnings.length,
      };
      const rows =
        workbook === 'essentials'
          ? await replaceEssentialsCatalog((parsed as ParsedEssentials).data, meta)
          : await replaceAccommodationCatalog((parsed as ParsedAccommodation).data, meta);
      onImported(rows);
      reset();
      onClose();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : tp('pricing', 'importFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay open prod-form-overlay" onClick={() => void requestClose()} role="presentation">
      <div className="modal prod-form-modal pcx-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green prod-form-modal-hd">
          <div>
            <div className="prod-form-modal-title">{tp('pricing', titleKey)}</div>
            <div className="prod-form-modal-sub">{tp('pricing', 'importReplaceWarning')}</div>
          </div>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()} aria-label={tp('pricing', 'closeAria')}>
            ✕
          </button>
        </div>

        <div className="prod-form-modal-bd">
          <div className="pcx-import-drop">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
            <p className="pcx-muted">{tp('pricing', 'importChooseFile')}</p>
          </div>

          {parseError && <div className="pcx-alert pcx-alert-error">{parseError}</div>}

          {parsed && (
            <>
              <div className="pcx-import-summary">
                <div>
                  <span className="pcx-stat-value">{parsed.sheets.length}</span>
                  <span className="pcx-stat-label">{tp('pricing', 'importSheetsRead')}</span>
                </div>
                <div>
                  <span className="pcx-stat-value">{parsed.rowCount.toLocaleString('en-US')}</span>
                  <span className="pcx-stat-label">{tp('pricing', 'importRowsParsed')}</span>
                </div>
                <div>
                  <span className={`pcx-stat-value${parsed.warnings.length ? ' warn' : ''}`}>
                    {parsed.warnings.length}
                  </span>
                  <span className="pcx-stat-label">{tp('pricing', 'importWarnings')}</span>
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-body" style={{ padding: 0, maxHeight: 260, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>{tp('pricing', 'importColSheet')}</th>
                        <th>{tp('pricing', 'importColDetectedAs')}</th>
                        <th style={{ textAlign: 'right' }}>{tp('pricing', 'importColRows')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.sheets.map((sheet) => (
                        <tr key={sheet.name}>
                          <td>
                            <b>{sheet.name.trim()}</b>
                          </td>
                          <td className="pcx-muted">{sheet.kind}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {sheet.parsed || <span className="pcx-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsed.warnings.length > 0 && (
                <div className="pcx-alert pcx-alert-warn" style={{ marginTop: 12 }}>
                  <b>{tp('pricing', 'importReviewBefore')}</b>
                  <ul className="pcx-warn-list">
                    {parsed.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <label className="pcx-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={busy}
                />
                <span>{tp('pricing', confirmKey)}</span>
              </label>
            </>
          )}

          {importError && <div className="pcx-alert pcx-alert-error">{importError}</div>}
        </div>

        <div className="prod-form-modal-ft">
          <button className="btn btn-s" type="button" onClick={() => void requestClose()} disabled={busy}>
            {tp('pricing', 'cancel')}
          </button>
          <button
            className="btn btn-p"
            type="button"
            onClick={() => void handleImport()}
            disabled={!parsed || !confirmed || busy}
          >
            {busy ? tp('pricing', 'importWorking') : tp('pricing', 'importReplaceAndImport')}
          </button>
        </div>
      </div>
    </div>
  );
}
