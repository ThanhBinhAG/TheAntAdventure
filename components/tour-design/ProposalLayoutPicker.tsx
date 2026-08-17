'use client';

import {
  PROPOSAL_LAYOUTS,
  type ProposalLayoutId,
} from '@/lib/proposals/proposal-layouts';

interface Props {
  value: ProposalLayoutId;
  onChange: (layoutId: ProposalLayoutId) => void;
  disabled?: boolean;
}

function LayoutThumb({ id }: { id: ProposalLayoutId }) {
  if (id === 'modern') {
    return (
      <span className="td-export-thumb td-export-thumb--modern" aria-hidden>
        <span className="td-export-thumb-hero" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line short" />
        <span className="td-export-thumb-block" />
      </span>
    );
  }
  if (id === 'compact') {
    return (
      <span className="td-export-thumb td-export-thumb--compact" aria-hidden>
        <span className="td-export-thumb-band" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line short" />
      </span>
    );
  }
  return (
    <span className="td-export-thumb td-export-thumb--classic" aria-hidden>
      <span className="td-export-thumb-body">
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line" />
        <span className="td-export-thumb-line short" />
        <span className="td-export-thumb-block soft" />
      </span>
      <span className="td-export-thumb-side" />
    </span>
  );
}

export default function ProposalLayoutPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="td-export-layout-grid" role="radiogroup" aria-label="Export layout">
      {PROPOSAL_LAYOUTS.map((layout) => {
        const selected = value === layout.id;
        return (
          <label
            key={layout.id}
            className={`td-export-layout-card${selected ? ' on' : ''}${disabled ? ' is-disabled' : ''}`}
            title={layout.description}
          >
            <input
              type="radio"
              className="sr-only"
              name="proposal-export-layout"
              value={layout.id}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(layout.id)}
            />
            <span className="td-export-layout-thumb-wrap">
              <LayoutThumb id={layout.id} />
              {selected ? <span className="td-export-layout-check" aria-hidden>✓</span> : null}
            </span>
            <span className="td-export-layout-copy">
              <span className="td-export-layout-name">{layout.label}</span>
              <span className="td-export-layout-desc">{layout.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
