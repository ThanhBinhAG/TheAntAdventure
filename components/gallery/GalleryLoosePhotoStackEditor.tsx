'use client';

import { useEffect, useState } from 'react';
import { formatBytes } from '@/lib/gallery-helpers';
import GalleryUploadZone from '@/components/gallery/GalleryUploadZone';
import GalleryDraftPhotoViewer from '@/components/gallery/GalleryDraftPhotoViewer';

export type LoosePhotoDraft = {
  localId: string;
  file: File;
  previewUrl: string;
  caption: string;
};

const VISIBLE_DRAFT_SLOTS = 4;

let draftSeq = 0;
function nextDraftId() {
  draftSeq += 1;
  return `loose-draft-${draftSeq}`;
}

interface Props {
  disabled?: boolean;
  showErrors?: boolean;
  onChange: (drafts: LoosePhotoDraft[]) => void;
}

export default function GalleryLoosePhotoStackEditor({
  disabled = false,
  showErrors = false,
  onChange,
}: Props) {
  const [drafts, setDrafts] = useState<LoosePhotoDraft[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    onChange(drafts);
  }, [drafts, onChange]);

  useEffect(() => {
    return () => {
      for (const d of drafts) URL.revokeObjectURL(d.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  function addFile(file: File) {
    const previewUrl = URL.createObjectURL(file);
    const base = file.name.replace(/\.[^.]+$/, '').replace(/_\d+$/, '');
    const draft: LoosePhotoDraft = {
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
    if (previewId === localId) setPreviewId(null);
  }

  function setCaption(localId: string, caption: string) {
    setDrafts((prev) => prev.map((d) => (d.localId === localId ? { ...d, caption } : d)));
  }

  const uploadIndex = drafts.length + 1;

  return (
    <div className="gallery-stack-editor">
      <div className="gallery-upload-stack-label">Loose photos (upload order)</div>
      <p className="gallery-stack-editor-hint">
        Add photos one by one. Up to {VISIBLE_DRAFT_SLOTS} show at once — scroll when you add more. Click a
        thumbnail to preview.
      </p>

      {drafts.length > 0 && (
        <div
          className={`gallery-stack-editor-scroll${drafts.length > VISIBLE_DRAFT_SLOTS ? ' has-scroll' : ''}`}
        >
          {drafts.map((draft, index) => {
            const captionError = showErrors && !draft.caption.trim();
            return (
              <div key={draft.localId} className="gallery-stack-editor-item">
                <div className="gallery-stack-editor-item-visual">
                  <span className="gallery-upload-zone-badge">Photo {index + 1}</span>
                  <button
                    type="button"
                    className="gallery-stack-editor-thumb-btn"
                    onClick={() => setPreviewId(draft.localId)}
                    disabled={disabled}
                    title="Preview image"
                  >
                    <span
                      className="gallery-stack-editor-thumb"
                      style={{ backgroundImage: `url(${draft.previewUrl})` }}
                    />
                    <span className="gallery-stack-editor-thumb-hover">Preview</span>
                  </button>
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
                    className={`gallery-stack-caption-input${captionError ? ' input-error' : ''}`}
                    value={draft.caption}
                    onChange={(e) => setCaption(draft.localId, e.target.value)}
                    placeholder="Caption…"
                    disabled={disabled}
                    aria-invalid={captionError}
                  />
                  {captionError && <p className="field-error">Caption is required.</p>}
                  <div className="gallery-stack-editor-item-ft">
                    <span className="gallery-slot-size">{formatBytes(draft.file.size)}</span>
                    <div className="gallery-stack-editor-item-links">
                      <button
                        type="button"
                        className="gallery-stack-preview-link"
                        onClick={() => setPreviewId(draft.localId)}
                        disabled={disabled}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="gallery-stack-remove-link"
                        onClick={() => removeDraft(draft.localId)}
                        disabled={disabled}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
        />
      </div>

      {drafts.length > 0 && (
        <div className="gallery-upload-pair-meta">
          <span>
            Ready to save: <strong>{drafts.length}</strong> photo{drafts.length === 1 ? '' : 's'}
          </span>
          <span className="gallery-tour-pair-detail">
            Total {formatBytes(drafts.reduce((n, d) => n + d.file.size, 0))}
          </span>
        </div>
      )}

      {showErrors && drafts.length === 0 && <p className="field-error">Add at least one image.</p>}

      <GalleryDraftPhotoViewer
        open={Boolean(previewId)}
        drafts={drafts}
        activeId={previewId ?? ''}
        onClose={() => setPreviewId(null)}
        onSelect={setPreviewId}
      />
    </div>
  );
}
