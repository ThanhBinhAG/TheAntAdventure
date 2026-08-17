'use client';

import { useRef, useState } from 'react';
import type { ProposalTemplateOverrides } from '@/lib/proposals/proposal-content-overrides';
import {
  DEFAULT_PROPOSAL_THEME,
  parseThemeHex,
  type ProposalTemplateTheme,
} from '@/lib/proposals/proposal-theme';
import type { ProposalLegalText, ProposalVariant } from '@/lib/proposals/proposal-types';

type PolicyKey = keyof ProposalLegalText;

interface Props {
  variant: ProposalVariant;
  value: ProposalTemplateOverrides;
  onChange: (next: ProposalTemplateOverrides) => void;
  onFocusAnchor?: (anchorId: string) => void;
}

const COLOR_SWATCHES: Array<{ token: keyof Required<ProposalTemplateTheme>; label: string }> = [
  { token: 'brand', label: 'Brand' },
  { token: 'brandDark', label: 'Brand dark' },
  { token: 'tableHeader', label: 'Table header' },
  { token: 'rowAlt', label: 'Alt row' },
];

const NAV_CHIPS: Array<{ id: string; label: string }> = [
  { id: 'tpl-colours', label: 'Colours' },
  { id: 'tpl-cover', label: 'Cover' },
  { id: 'tpl-lists', label: 'Lists' },
  { id: 'tpl-booking', label: 'Booking' },
  { id: 'tpl-pricing', label: 'Pricing' },
  { id: 'tpl-policies', label: 'Policies' },
];

function updateList(list: string[] | undefined, index: number, text: string): string[] {
  const next = [...(list ?? [])];
  next[index] = text;
  return next;
}

function removeAt(list: string[] | undefined, index: number): string[] {
  return (list ?? []).filter((_, i) => i !== index);
}

function excerpt(text: string): string {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return 'Empty — click to edit';
  return plain.length > 96 ? `${plain.slice(0, 96)}…` : plain;
}

function ColorSwatch({
  label,
  token,
  theme,
  onTheme,
}: {
  label: string;
  token: keyof Required<ProposalTemplateTheme>;
  theme: Required<ProposalTemplateTheme>;
  onTheme: (next: ProposalTemplateTheme) => void;
}) {
  const hex = theme[token];
  const [hexText, setHexText] = useState(hex);
  const [prevHex, setPrevHex] = useState(hex);
  if (hex !== prevHex) {
    setPrevHex(hex);
    setHexText(hex);
  }
  return (
    <label className="proposal-template-swatch" title={`${label} ${hex}`}>
      <input
        type="color"
        value={hex}
        aria-label={label}
        onChange={(e) => onTheme({ ...theme, [token]: e.target.value.toUpperCase() })}
      />
      <span className="proposal-template-swatch-name">{label}</span>
      <input
        type="text"
        className="proposal-template-swatch-hex"
        value={hexText}
        spellCheck={false}
        aria-label={`${label} hex`}
        onChange={(e) => {
          setHexText(e.target.value);
          const parsed = parseThemeHex(e.target.value);
          if (parsed) onTheme({ ...theme, [token]: parsed });
        }}
      />
    </label>
  );
}

function LineList({
  title,
  lines,
  anchor,
  onFocusAnchor,
  onChangeLines,
}: {
  title: string;
  lines: string[];
  anchor: string;
  onFocusAnchor?: (id: string) => void;
  onChangeLines: (next: string[]) => void;
}) {
  return (
    <div className="proposal-template-list">
      <div className="proposal-template-list-hd">
        <span className="lbl">{title}</span>
        <button
          type="button"
          className="proposal-template-add"
          onClick={() => {
            onFocusAnchor?.(anchor);
            onChangeLines([...lines, '']);
          }}
        >
          + Add
        </button>
      </div>
      {lines.map((line, i) => (
        <div key={`${anchor}-${i}`} className="proposal-template-line">
          <span className="proposal-template-line-n" aria-hidden>
            {i + 1}
          </span>
          <textarea
            className="proposal-template-grow"
            rows={2}
            value={line}
            onChange={(e) => onChangeLines(updateList(lines, i, e.target.value))}
            onFocus={() => onFocusAnchor?.(anchor)}
            onClick={() => onFocusAnchor?.(anchor)}
          />
          <button
            type="button"
            className="proposal-template-remove"
            title="Remove line"
            onClick={() => onChangeLines(removeAt(lines, i))}
          >
            −
          </button>
        </div>
      ))}
    </div>
  );
}

export default function ProposalTemplateForm({ variant, value, onChange, onFocusAnchor }: Props) {
  const inclusions = value.inclusions ?? [''];
  const exclusions = value.exclusions ?? [''];
  const isB2c = variant === 'b2c';
  const theme = { ...DEFAULT_PROPOSAL_THEME, ...value.theme };
  const [openPolicy, setOpenPolicy] = useState<PolicyKey | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const focus = (anchorId: string) => ({
    onFocus: () => onFocusAnchor?.(anchorId),
    onClick: () => onFocusAnchor?.(anchorId),
  });

  const policies: Array<{ key: PolicyKey; label: string; anchor: string }> = [
    {
      key: 'paymentTerms',
      label: isB2c ? 'Payment policy' : 'Payment policy (B2B PDF hides legal)',
      anchor: 'legal.paymentTerms',
    },
    { key: 'cancellation', label: 'Cancellation policy', anchor: 'legal.cancellation' },
    { key: 'amendment', label: 'Amendment policy', anchor: 'legal.amendment' },
    { key: 'importantNotes', label: 'Important notes', anchor: 'legal.importantNotes' },
  ];

  function togglePolicy(key: PolicyKey, anchor: string) {
    const next = openPolicy === key ? null : key;
    setOpenPolicy(next);
    if (next) onFocusAnchor?.(anchor);
  }

  function scrollToSection(id: string) {
    const root = formRef.current;
    const el = root?.querySelector(`#${id}`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="proposal-template-form" ref={formRef}>
      <div className="proposal-template-topbar" role="navigation" aria-label="Template sections">
        {NAV_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="proposal-template-nav-chip"
            onClick={() => scrollToSection(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <section id="tpl-colours" className="proposal-template-section">
        <div className="proposal-template-section-hd-row">
          <div className="proposal-template-section-hd">Brand colours</div>
          <button
            type="button"
            className="proposal-template-link"
            onClick={() => onChange({ ...value, theme: { ...DEFAULT_PROPOSAL_THEME } })}
          >
            Reset colours
          </button>
        </div>
        <div className="proposal-template-swatches">
          {COLOR_SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch.token}
              label={swatch.label}
              token={swatch.token}
              theme={theme}
              onTheme={(next) => onChange({ ...value, theme: next })}
            />
          ))}
        </div>
      </section>

      <section id="tpl-cover" className="proposal-template-section">
        <div className="proposal-template-section-hd">Cover</div>
        <label className="lbl">Tagline (cover subtitle)</label>
        <textarea
          className="proposal-template-grow"
          rows={2}
          value={value.tagline ?? ''}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          placeholder="Journey subtitle shown under the tour title"
          {...focus('tagline')}
        />
      </section>

      <section id="tpl-lists" className="proposal-template-section">
        <div className="proposal-template-section-hd">Inclusions & exclusions</div>
        <LineList
          title="Inclusions"
          lines={inclusions}
          anchor="inclusions"
          onFocusAnchor={onFocusAnchor}
          onChangeLines={(next) => onChange({ ...value, inclusions: next })}
        />
        <LineList
          title="Exclusions"
          lines={exclusions}
          anchor="exclusions"
          onFocusAnchor={onFocusAnchor}
          onChangeLines={(next) => onChange({ ...value, exclusions: next })}
        />
      </section>

      <section id="tpl-booking" className="proposal-template-section">
        <div className="proposal-template-section-hd">Booking</div>
        <label className="lbl">{isB2c ? 'Payment Terms' : 'Commission'}</label>
        <input
          type="text"
          value={
            isB2c
              ? value.bookingFields?.['Payment Terms'] ?? ''
              : value.bookingFields?.Commission ?? ''
          }
          onChange={(e) =>
            onChange({
              ...value,
              bookingFields: {
                ...value.bookingFields,
                ...(isB2c ? { 'Payment Terms': e.target.value } : { Commission: e.target.value }),
              },
            })
          }
          {...focus(isB2c ? 'booking.Payment Terms' : 'booking.Commission')}
        />

        <label className="lbl">Valid Until</label>
        <input
          type="text"
          value={value.bookingFields?.['Valid Until'] ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              bookingFields: { ...value.bookingFields, 'Valid Until': e.target.value },
            })
          }
          {...focus('booking.Valid Until')}
        />
      </section>

      <section id="tpl-pricing" className="proposal-template-section">
        <div className="proposal-template-section-hd">Pricing copy</div>
        {isB2c ? (
          <>
            <label className="lbl">Pricing footnote</label>
            <textarea
              className="proposal-template-grow"
              rows={2}
              value={value.pricingText?.footnote ?? ''}
              onChange={(e) =>
                onChange({ ...value, pricingText: { ...value.pricingText, footnote: e.target.value } })
              }
              {...focus('pricing.footnote')}
            />
          </>
        ) : (
          <>
            <label className="lbl">Ground arrangements description</label>
            <textarea
              className="proposal-template-grow"
              rows={2}
              value={value.pricingText?.b2bGroundDesc ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  pricingText: { ...value.pricingText, b2bGroundDesc: e.target.value },
                })
              }
              {...focus('pricing.b2bGroundDesc')}
            />
            <label className="lbl">Flights description</label>
            <textarea
              className="proposal-template-grow"
              rows={2}
              value={value.pricingText?.b2bFlightsDesc ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  pricingText: { ...value.pricingText, b2bFlightsDesc: e.target.value },
                })
              }
              {...focus('pricing.b2bFlightsDesc')}
            />
            <label className="lbl">Quotation footnote</label>
            <textarea
              className="proposal-template-grow"
              rows={2}
              value={value.pricingText?.footnote ?? ''}
              onChange={(e) =>
                onChange({ ...value, pricingText: { ...value.pricingText, footnote: e.target.value } })
              }
              {...focus('pricing.footnote')}
            />
          </>
        )}
      </section>

      <section id="tpl-policies" className="proposal-template-section">
        <div className="proposal-template-section-hd">Policies</div>
        <div className="proposal-template-policies">
          {policies.map((policy) => {
            const open = openPolicy === policy.key;
            const text = value.legalText?.[policy.key] ?? '';
            return (
              <div key={policy.key} className={`proposal-template-policy${open ? ' open' : ''}`}>
                <button
                  type="button"
                  className="proposal-template-policy-hd"
                  onClick={() => togglePolicy(policy.key, policy.anchor)}
                >
                  <span className="lbl">{policy.label}</span>
                  {!open && <span className="proposal-template-policy-excerpt">{excerpt(text)}</span>}
                </button>
                {open && (
                  <textarea
                    className="proposal-template-grow proposal-template-grow--policy"
                    rows={6}
                    value={text}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        legalText: { ...value.legalText, [policy.key]: e.target.value },
                      })
                    }
                    {...focus(policy.anchor)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
