'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatBytes } from '@/lib/gallery-helpers';
import GalleryUploadZone from '@/components/gallery/GalleryUploadZone';

export type TourPhotoDraft = {
  localId: string;
  file: File;
  previewUrl: string;
  caption: string;
  previewSlot?: 1 | 2;
};

const VISIBLE_DRAFT_SLOTS = 4;

let draftSeq = 0;
function nextDraftId() {
  draftSeq += 1;
  return `draft-${draftSeq}`;
}

interface Props {
  disabled?: boolean;
  onChange: (drafts: TourPhotoDraft[]) => void;
}

export default function GalleryTourPhotoStackEditor({ disabled = false, onChange }: Props) {
  const [drafts, setDrafts] = useState<TourPhotoDraft[]>([]);

  useEffect(() => {
    onChange(drafts);
  }, [drafts, onChange]);

  useEffect(() => {
    return () => {
      for (const d of drafts) URL.revokeObjectURL(d.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const starred = useMemo(() => {
    const top = drafts.find((d) => d.previewSlot === 1);
    const bottom = drafts.find((d) => d.previewSlot === 2);
    return { top, bottom, count: (top ? 1 : 0) + (bottom ? 1 : 0) };
  }, [drafts]);

  function addFile(file: File) {
    const previewUrl = URL.createObjectURL(file);
    const base = file.name.replace(/\.[^.]+$/, '').replace(/_\d+$/, '');
    const draft: TourPhotoDraft = {
      localId: nextDraftId(),
      file,
      previewUrl,
      caption: base,
    };
    setDrafts((prev) => [...prev, draft]);
  }

  function removeDraft(localId: string) {
    setDrafts((prev) => {
      const target = prev.find((d) => d.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((d) => d.localId !== localId);
    });
  }

  function setCaption(localId: string, caption: string) {
    setDrafts((prev) => prev.map((d) => (d.localId === localId ? { ...d, caption } : d)));
  }

  function togglePreviewSlot(localId: string, slot: 1 | 2) {
    setDrafts((prev) => {
      const target = prev.find((d) => d.localId === localId);
      if (!target) return prev;

      if (target.previewSlot === slot) {
        return prev.map((d) => (d.localId === localId ? { ...d, previewSlot: undefined } : d));
      }

      return prev.map((d) => {
        if (d.localId === localId) return { ...d, previewSlot: slot };
        if (d.previewSlot === slot) return { ...d, previewSlot: undefined };
        return d;
      });
    });
  }

  const uploadIndex = drafts.length + 1;

  return (
    <div className="gallery-stack-editor">
      <div className="gallery-upload-stack-label">Tour photos (upload order)</div>
      <p className="gallery-stack-editor-hint">
        Add photos one by one. Mark up to <strong>2 stars</strong> for the preview pair shown on the tour card.
        Up to {VISIBLE_DRAFT_SLOTS} show at once — scroll when you add more.
      </p>

      {drafts.length > 0 && (
        <div
          className={`gallery-stack-editor-scroll${drafts.length > VISIBLE_DRAFT_SLOTS ? ' has-scroll' : ''}`}
        >
          {drafts.map((draft, index) => (
            <div key={draft.localId} className={`gallery-stack-editor-item${draft.previewSlot ? ' starred' : ''}`}>
              <div className="gallery-stack-editor-item-visual">
                <span className="gallery-upload-zone-badge">Photo {index + 1}</span>
                <div
                  className="gallery-stack-editor-thumb"
                  style={{ backgroundImage: `url(${draft.previewUrl})` }}
                />
                {draft.previewSlot && (
                  <span className={`gallery-stack-star-badge slot-${draft.previewSlot}`}>
                    ★ Preview {draft.previewSlot === 1 ? 'top' : 'bottom'}
                  </span>
                )}
                <button
                  type="button"
                  className="gallery-stack-editor-remove"
                  onClick={() => removeDraft(draft.localId)}
                  disabled={disabled}
                  title="Remove photo"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  ✕
                </button>
              </div>

              <div className="gallery-stack-editor-item-meta">
                <input
                  className="gallery-stack-caption-input"
                  value={draft.caption}
                  onChange={(e) => setCaption(draft.localId, e.target.value)}
                  placeholder="Caption…"
                  disabled={disabled}
                />
                <div className="gallery-stack-editor-item-ft">
                  <span className="gallery-slot-size">{formatBytes(draft.file.size)}</span>
                  <button
                    type="button"
                    className="gallery-stack-remove-link"
                    onClick={() => removeDraft(draft.localId)}
                    disabled={disabled}
                  >
                    Remove
                  </button>
                </div>
                <div className="gallery-stack-star-actions">
                  <button
                    type="button"
                    className={`gallery-star-btn${draft.previewSlot === 1 ? ' on' : ''}`}
                    onClick={() => togglePreviewSlot(draft.localId, 1)}
                    disabled={disabled}
                    title="Show as top preview on tour card"
                  >
                    {draft.previewSlot === 1 ? '★' : '☆'} Top
                  </button>
                  <button
                    type="button"
                    className={`gallery-star-btn${draft.previewSlot === 2 ? ' on' : ''}`}
                    onClick={() => togglePreviewSlot(draft.localId, 2)}
                    disabled={disabled}
                    title="Show as bottom preview on tour card"
                  >
                    {draft.previewSlot === 2 ? '★' : '☆'} Bottom
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {drafts.length > VISIBLE_DRAFT_SLOTS && (
        <p className="gallery-stack-scroll-hint">
          {drafts.length} photos added — scroll the list above to review earlier ones.
        </p>
      )}

      <div className="gallery-stack-editor-pending">
        <GalleryUploadZone
          label={`Photo ${uploadIndex}`}
          sublabel={drafts.length === 0 ? 'Start with your first image' : 'Add another (optional)'}
          optional={drafts.length > 0}
          disabled={disabled}
          onChange={(file) => {
            if (file) addFile(file);
          }}
          stacked
          slotNum={uploadIndex <= 2 ? (uploadIndex as 1 | 2) : undefined}
        />
      </div>

      {drafts.length > 0 && (
        <div className="gallery-upload-pair-meta">
          <span>
            Preview pair:{' '}
            <strong>
              {starred.count}/2
              {starred.count === 2 ? ' ✓' : ''}
            </strong>
          </span>
          <span className="gallery-tour-pair-detail">
            Total {formatBytes(drafts.reduce((n, d) => n + d.file.size, 0))}
          </span>
        </div>
      )}
    </div>
  );
}
