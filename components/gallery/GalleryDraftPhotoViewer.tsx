'use client';

import { useEffect } from 'react';
import { formatBytes } from '@/lib/gallery-helpers';
import type { LoosePhotoDraft } from '@/components/gallery/GalleryLoosePhotoStackEditor';

interface Props {
  open: boolean;
  drafts: LoosePhotoDraft[];
  activeId: string;
  onClose: () => void;
  onSelect: (localId: string) => void;
}

export default function GalleryDraftPhotoViewer({
  open,
  drafts,
  activeId,
  onClose,
  onSelect,
}: Props) {
  const active = drafts.find((d) => d.localId === activeId) ?? drafts[0];
  const activeIndex = drafts.findIndex((d) => d.localId === active?.localId);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const next = drafts[activeIndex + 1];
        if (next) onSelect(next.localId);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prev = drafts[activeIndex - 1];
        if (prev) onSelect(prev.localId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, drafts, activeIndex, onClose, onSelect]);

  if (!open || !drafts.length || !active) return null;

  return (
    <div className="modal-overlay open gallery-tour-viewer gallery-draft-viewer" onClick={onClose}>
      <div className="gallery-tour-viewer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-tour-viewer-hd">
          <div>
            <div className="gallery-tour-viewer-title">Preview upload</div>
            <div className="gallery-tour-viewer-code">
              Photo {activeIndex + 1} of {drafts.length}
            </div>
          </div>
          <button type="button" className="gallery-tour-viewer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="gallery-tour-viewer-body">
          <div className="gallery-tour-viewer-main">
            <div className="gallery-tour-viewer-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.previewUrl}
                alt={active.caption || active.file.name}
                className="gallery-draft-viewer-img"
              />
            </div>
            <div className="gallery-tour-viewer-meta">
              <div className="gallery-tour-viewer-caption">{active.caption || 'Untitled'}</div>
              <div className="gallery-tour-viewer-meta-row">
                <span className="gallery-tour-viewer-role">{active.file.name}</span>
                <span className="gallery-slot-size">{formatBytes(active.file.size)}</span>
              </div>
            </div>
          </div>

          {drafts.length > 1 && (
            <aside className="gallery-tour-viewer-side">
              <div className="gallery-tour-viewer-side-hd">
                <span>All uploads</span>
                <span className="gallery-tour-viewer-count">{drafts.length}</span>
              </div>
              <div className="gallery-tour-viewer-strip">
                {drafts.map((draft, index) => {
                  const isActive = draft.localId === active.localId;
                  return (
                    <button
                      key={draft.localId}
                      type="button"
                      className={`gallery-tour-viewer-thumb${isActive ? ' active' : ''}`}
                      onClick={() => onSelect(draft.localId)}
                    >
                      <div className="gallery-tour-viewer-thumb-img">
                        <div
                          className="gallery-draft-viewer-thumb"
                          style={{ backgroundImage: `url(${draft.previewUrl})` }}
                        />
                      </div>
                      <div className="gallery-tour-viewer-thumb-meta">
                        <span className="gallery-tour-viewer-thumb-cap">
                          {draft.caption || `Photo ${index + 1}`}
                        </span>
                        <span className="gallery-slot-size">{formatBytes(draft.file.size)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
