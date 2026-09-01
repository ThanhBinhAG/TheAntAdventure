'use client';

import { useRef, useState } from 'react';
import { formatBytes } from '@/lib/gallery/gallery-helpers';
import { collectDroppedImageFiles, collectPickedImageFiles } from '@/lib/gallery/upload-intake';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  label: string;
  sublabel?: string;
  optional?: boolean;
  previewUrl?: string;
  file?: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onFilesChange?: (files: File[], rejectedCount: number) => void;
  stacked?: boolean;
  slotNum?: 1 | 2;
  multiple?: boolean;
}

export default function GalleryUploadZone({
  label,
  sublabel,
  optional = false,
  previewUrl,
  file,
  disabled = false,
  onChange,
  onFilesChange,
  stacked = false,
  slotNum,
  multiple = false,
}: Props) {
  const { tp, tpl } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(files: FileList | null) {
    const result = collectPickedImageFiles(files);
    if (onFilesChange) onFilesChange(result.accepted, result.rejectedCount);
    const first = result.accepted[0];
    if (!first) return;
    onChange(first);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const hasPreview = Boolean(previewUrl);

  return (
    <div
      className={`gallery-upload-zone${hasPreview ? ' has-image' : ''}${dragOver ? ' dragover' : ''}${stacked ? ' stacked' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const result = await collectDroppedImageFiles(e.dataTransfer);
        if (onFilesChange) onFilesChange(result.accepted, result.rejectedCount);
        const first = result.accepted[0];
        if (!first) return;
        onChange(first);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      {slotNum && (
        <span className="gallery-upload-zone-badge">{tpl('gallery', 'slotBadge', { num: slotNum })}</span>
      )}

      {hasPreview ? (
        <>
          <div className="gallery-upload-zone-preview" style={{ backgroundImage: `url(${previewUrl})` }} />
          <div className="gallery-upload-zone-overlay">
            <span className="gallery-upload-zone-change">{tp('gallery', 'changeImage')}</span>
            {file && <span className="gallery-upload-zone-size">{formatBytes(file.size)}</span>}
          </div>
          <button
            type="button"
            className="gallery-upload-zone-clear"
            onClick={clear}
            disabled={disabled}
            title={tp('gallery', 'removeTitle')}
          >
            ✕
          </button>
        </>
      ) : (
        <div className="gallery-upload-zone-empty">
          <div className="gallery-upload-zone-icon">📷</div>
          <div className="gallery-upload-zone-label">
            {label}
            {optional && <span className="gallery-upload-zone-opt">{tp('gallery', 'optional')}</span>}
          </div>
          {sublabel && <div className="gallery-upload-zone-sub">{sublabel}</div>}
          <div className="gallery-upload-zone-hint">{tp('gallery', 'dropOrBrowseHint')}</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
