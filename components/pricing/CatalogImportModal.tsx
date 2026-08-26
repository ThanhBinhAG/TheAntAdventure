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

type ParsedEssentials = CatalogParseResult<EssentialsCatalog>;
type ParsedAccommodation = CatalogParseResult<AccommodationCatalog>;
type Parsed = ParsedEssentials | ParsedAccommodation;

interface Props {
  open: boolean;
  workbook: CatalogWorkbook;
  onClose: () => void;
  onImported: (rowCount: number) => void;
}

const TITLES: Record<CatalogWorkbook, string> = {
  essentials: 'Import Essentials workbook',
  accommodation: 'Import Accommodation & Cruises workbook',
};

export default function CatalogImportModal({ open, workbook, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const reset = useCallback(() => {
    setParsed(null);
    setFileName('');
    setParseError(null);
    setImportError(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  if (!open) return null;

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

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
      setParseError(e instanceof Error ? e.message : 'Could not read this Excel file.');
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
      setImportError(e instanceof Error ? e.message : 'The import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay open prod-form-overlay" onClick={handleClose} role="presentation">
      <div className="modal prod-form-modal pcx-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green prod-form-modal-hd">
          <div>
            <div className="prod-form-modal-title">{TITLES[workbook]}</div>
            <div className="prod-form-modal-sub">
              Every sheet is imported and replaces the current data for this section.
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={handleClose} aria-label="Close">
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
            <p className="pcx-muted">
              Choose the source .xlsx file. Nothing is written until you confirm the preview below.
            </p>
          </div>

          {parseError && <div className="pcx-alert pcx-alert-error">{parseError}</div>}

          {parsed && (
            <>
              <div className="pcx-import-summary">
                <div>
                  <span className="pcx-stat-value">{parsed.sheets.length}</span>
                  <span className="pcx-stat-label">sheets read</span>
                </div>
                <div>
                  <span className="pcx-stat-value">{parsed.rowCount.toLocaleString('en-US')}</span>
                  <span className="pcx-stat-label">rows parsed</span>
                </div>
                <div>
                  <span className={`pcx-stat-value${parsed.warnings.length ? ' warn' : ''}`}>
                    {parsed.warnings.length}
                  </span>
                  <span className="pcx-stat-label">warnings</span>
                </div>
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-body" style={{ padding: 0, maxHeight: 260, overflow: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Sheet</th>
                        <th>Detected as</th>
                        <th style={{ textAlign: 'right' }}>Rows</th>
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
                  <b>Review before importing</b>
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
                <span>
                  Replace all existing {workbook === 'essentials' ? 'Essentials' : 'Accommodation & Cruises'} data
                  with this workbook.
                </span>
              </label>
            </>
          )}

          {importError && <div className="pcx-alert pcx-alert-error">{importError}</div>}
        </div>

        <div className="prod-form-modal-ft">
          <button className="btn btn-s" type="button" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-p"
            type="button"
            onClick={() => void handleImport()}
            disabled={!parsed || !confirmed || busy}
          >
            {busy ? 'Working…' : 'Replace and import'}
          </button>
        </div>
      </div>
    </div>
  );
}
