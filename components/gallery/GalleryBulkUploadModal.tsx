'use client';

import { useCallback, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { formatBytes } from '@/lib/gallery-helpers';
import {
  findBulkSlotConflicts,
  parseBulkFiles,
  type ParsedBulkFile,
} from '@/lib/gallery-bulk-upload';

export type BulkUploadItem = {
  file: File;
  productCode: string;
  slot: 1 | 2 | null;
  caption: string;
  region: string;
  overwrite?: boolean;
};

interface Props {
  open: boolean;
  products: Product[];
  existingPhotos: GalleryPhoto[];
  uploading: boolean;
  progress: { done: number; total: number; label: string };
  onClose: () => void;
  onUpload: (items: BulkUploadItem[], overwriteSlots: boolean) => void | Promise<void>;
}

export default function GalleryBulkUploadModal({
  open,
  products,
  existingPhotos,
  uploading,
  progress,
  onClose,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedBulkFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  const productCodes = products.map((p) => p.code);
  const productByCode = new Map(products.map((p) => [p.code, p]));

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setParsed(parseBulkFiles(files, productCodes));
    },
    [productCodes]
  );

  const okRows = parsed.filter((r) => r.status === 'ok' && r.productCode);
  const conflicts = findBulkSlotConflicts(parsed, existingPhotos, overwrite);
  const canUpload = okRows.length > 0 && !uploading && conflicts.length === 0;

  function buildItems(): BulkUploadItem[] {
    return okRows.map((row) => {
      const product = productByCode.get(row.productCode!)!;
      const base = row.fileName.replace(/\.[^.]+$/, '');
      return {
        file: row.file,
        productCode: row.productCode!,
        slot: row.slot,
        caption: base,
        region: product.region || 'north',
      };
    });
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={() => !uploading && onClose()}>
      <div className="modal gallery-bulk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green gallery-upload-modal-hd">
          <div className="gallery-upload-modal-hd-text">
            <span className="gallery-upload-modal-icon">📁</span>
            <div>
              <div className="gallery-upload-modal-title">Upload folder</div>
              <div className="gallery-upload-modal-subtitle">Bulk import tour photos by filename convention</div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={uploading}>
            ✕
          </button>
        </div>

        <div className="gallery-upload-modal-body">
          <div className="gallery-bulk-intro">
            Name files as <code>PRODUCT_CODE_1.jpg</code> and <code>PRODUCT_CODE_2.jpg</code> for preview slots.
            Use <code>_3</code>, <code>_4</code>, … for spare photos linked to the same tour.
          </div>

          <div
            className={`gallery-bulk-drop${dragOver ? ' dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="gallery-upload-zone-icon">📂</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Choose folder or drop files here</div>
            <div style={{ fontSize: 11, color: 'var(--m)' }}>JPEG, PNG, WebP · max 10 MB each</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              // @ts-expect-error webkitdirectory is supported in Chromium browsers
              webkitdirectory=""
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {parsed.length > 0 && (
            <>
              <table className="gallery-bulk-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Tour</th>
                    <th>Slot</th>
                    <th>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row) => (
                    <tr key={row.fileName}>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.fileName}>
                        {row.fileName}
                      </td>
                      <td>{row.productCode || '—'}</td>
                      <td>{row.slot === 1 || row.slot === 2 ? row.slot : row.poolIndex ? `pool ${row.poolIndex}` : '—'}</td>
                      <td>{formatBytes(row.file.size)}</td>
                      <td
                        className={
                          row.status === 'ok'
                            ? 'gallery-bulk-status-ok'
                            : row.status === 'unknown_product'
                              ? 'gallery-bulk-status-warn'
                              : 'gallery-bulk-status-err'
                        }
                      >
                        {row.status === 'ok' ? 'OK' : row.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {conflicts.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--amb)', marginTop: 10 }}>
                  {conflicts.length} slot conflict(s). Enable overwrite or remove conflicting files.
                </div>
              )}

              <label className="gallery-bulk-overwrite">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  disabled={uploading}
                />
                Overwrite existing slot photos
              </label>
            </>
          )}

          {uploading && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 4 }}>
                {progress.label} ({progress.done}/{progress.total})
              </div>
              <div className="gallery-bulk-progress">
                <div
                  className="gallery-bulk-progress-bar"
                  style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="gallery-upload-modal-ft">
          <button className="btn btn-s" type="button" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="btn btn-p"
            type="button"
            disabled={!canUpload}
            onClick={() => void onUpload(buildItems(), overwrite)}
          >
            {uploading ? 'Uploading…' : `Upload ${okRows.length} photo${okRows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
