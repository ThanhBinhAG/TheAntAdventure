'use client';

import { useLanguage } from '@/hooks/useLanguage';
import {
  PROPOSAL_LAYOUTS,
  type ProposalLayoutId,
} from '@/lib/proposals/proposal-layouts';
import type { TOUR_DESIGNKey } from '@/lib/i18n/pages/tour-design';

interface Props {
  value: ProposalLayoutId;
  onChange: (layoutId: ProposalLayoutId) => void;
  disabled?: boolean;
}

const LAYOUT_I18N: Record<ProposalLayoutId, { nameKey: TOUR_DESIGNKey; descKey: TOUR_DESIGNKey }> = {
  classic: { nameKey: 'exportLayoutClassic', descKey: 'exportLayoutClassicDesc' },
  modern: { nameKey: 'exportLayoutModern', descKey: 'exportLayoutModernDesc' },
  compact: { nameKey: 'exportLayoutCompact', descKey: 'exportLayoutCompactDesc' },
};

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
  const { tp } = useLanguage();

  return (
    <div className="td-export-layout-grid" role="radiogroup" aria-label={tp('tour-design', 'exportLayoutAria')}>
      {PROPOSAL_LAYOUTS.map((layout) => {
        const selected = value === layout.id;
        const i18n = LAYOUT_I18N[layout.id];
        const name = tp('tour-design', i18n.nameKey);
        const description = tp('tour-design', i18n.descKey);
        return (
          <label
            key={layout.id}
            className={`td-export-layout-card${selected ? ' on' : ''}${disabled ? ' is-disabled' : ''}`}
            title={description}
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
              <span className="td-export-layout-name">{name}</span>
              <span className="td-export-layout-desc">{description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
