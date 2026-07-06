'use client';

import { GALLERY_TAG_TAXONOMY } from '@/lib/gallery-tags';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
  customTag: string;
  onCustomTagChange: (value: string) => void;
  onAddCustomTag: () => void;
}

export default function GalleryTagSelector({ selected, onChange, customTag, onCustomTagChange, onAddCustomTag }: Props) {
  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  }

  return (
    <div>
      <div className="gallery-tag-selector">
        {Object.entries(GALLERY_TAG_TAXONOMY).map(([cat, tags]) => (
          <div key={cat} className="gallery-tag-category">
            <div className="gallery-tag-category-lbl">{cat}</div>
            <div className="gallery-tag-pills">
              {tags.map((tag) => {
                const on = selected.includes(tag);
                return (
                  <button key={tag} type="button" className={`gallery-tag-pill${on ? ' on' : ''}`} onClick={() => toggle(tag)}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="gallery-custom-tag-row">
        <input
          value={customTag}
          onChange={(e) => onCustomTagChange(e.target.value)}
          placeholder="Add custom tag…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddCustomTag();
            }
          }}
        />
        <button type="button" className="btn btn-s btn-sm" onClick={onAddCustomTag}>
          + Add
        </button>
      </div>
      {selected.length > 0 && (
        <div className="gallery-selected-tags">
          {selected.map((t) => (
            <span key={t} className="gallery-tag gallery-tag-removable">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => toggle(t)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>Click taxonomy tags or add your own. Selected tags are highlighted in green.</div>
    </div>
  );
}
