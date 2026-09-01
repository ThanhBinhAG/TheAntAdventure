'use client';

import { useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { ProposalTemplateOverrides } from '@/lib/proposals/proposal-content-overrides';
import {
  DEFAULT_PROPOSAL_THEME,
  parseThemeHex,
  type ProposalTemplateTheme,
} from '@/lib/proposals/proposal-theme';
import type { ProposalLegalText, ProposalVariant } from '@/lib/proposals/proposal-types';
import type { TOUR_DESIGNKey } from '@/lib/i18n/pages/tour-design';

type PolicyKey = keyof ProposalLegalText;

interface Props {
  variant: ProposalVariant;
  value: ProposalTemplateOverrides;
  onChange: (next: ProposalTemplateOverrides) => void;
  onFocusAnchor?: (anchorId: string) => void;
}

const COLOR_SWATCHES: Array<{ token: keyof Required<ProposalTemplateTheme>; key: TOUR_DESIGNKey }> = [
  { token: 'brand', key: 'tplColourBrand' },
  { token: 'brandDark', key: 'tplColourBrandDark' },
  { token: 'tableHeader', key: 'tplColourTableHeader' },
  { token: 'rowAlt', key: 'tplColourRowAlt' },
];

const NAV_CHIPS: Array<{ id: string; key: TOUR_DESIGNKey }> = [
  { id: 'tpl-colours', key: 'tplNavColours' },
  { id: 'tpl-cover', key: 'tplNavCover' },
  { id: 'tpl-lists', key: 'tplNavLists' },
  { id: 'tpl-booking', key: 'tplNavBooking' },
  { id: 'tpl-pricing', key: 'tplNavPricing' },
  { id: 'tpl-policies', key: 'tplNavPolicies' },
];

function updateList(list: string[] | undefined, index: number, text: string): string[] {
  const next = [...(list ?? [])];
  next[index] = text;
  return next;
}

function removeAt(list: string[] | undefined, index: number): string[] {
  return (list ?? []).filter((_, i) => i !== index);
}

function excerpt(text: string, emptyLabel: string): string {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return emptyLabel;
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
  addLabel,
  removeTitle,
}: {
  title: string;
  lines: string[];
  anchor: string;
  onFocusAnchor?: (id: string) => void;
  onChangeLines: (next: string[]) => void;
  addLabel: string;
  removeTitle: string;
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
          {addLabel}
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
            title={removeTitle}
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
  const { tp } = useLanguage();
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

  const policies: Array<{ key: PolicyKey; labelKey: TOUR_DESIGNKey; anchor: string }> = [
    {
      key: 'paymentTerms',
      labelKey: isB2c ? 'tplPaymentPolicy' : 'tplPaymentPolicyB2b',
      anchor: 'legal.paymentTerms',
    },
    { key: 'cancellation', labelKey: 'tplCancellation', anchor: 'legal.cancellation' },
    { key: 'amendment', labelKey: 'tplAmendment', anchor: 'legal.amendment' },
    { key: 'importantNotes', labelKey: 'tplImportantNotes', anchor: 'legal.importantNotes' },
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
            {tp('tour-design', chip.key)}
          </button>
        ))}
      </div>

      <section id="tpl-colours" className="proposal-template-section">
        <div className="proposal-template-section-hd-row">
          <div className="proposal-template-section-hd">{tp('tour-design', 'tplBrandColours')}</div>
          <button
            type="button"
            className="proposal-template-link"
            onClick={() => onChange({ ...value, theme: { ...DEFAULT_PROPOSAL_THEME } })}
          >
            {tp('tour-design', 'tplResetColours')}
          </button>
        </div>
        <div className="proposal-template-swatches">
          {COLOR_SWATCHES.map((swatch) => (
            <ColorSwatch
              key={swatch.token}
              label={tp('tour-design', swatch.key)}
              token={swatch.token}
              theme={theme}
              onTheme={(next) => onChange({ ...value, theme: next })}
            />
          ))}
        </div>
      </section>

      <section id="tpl-cover" className="proposal-template-section">
        <div className="proposal-template-section-hd">{tp('tour-design', 'tplCover')}</div>
        <label className="lbl">{tp('tour-design', 'tplTagline')}</label>
        <textarea
          className="proposal-template-grow"
          rows={2}
          value={value.tagline ?? ''}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          placeholder={tp('tour-design', 'tplTaglinePlaceholder')}
          {...focus('tagline')}
        />
      </section>

      <section id="tpl-lists" className="proposal-template-section">
        <div className="proposal-template-section-hd">{tp('tour-design', 'tplInclExcl')}</div>
        <LineList
          title={tp('tour-design', 'tplInclusions')}
          lines={inclusions}
          anchor="inclusions"
          onFocusAnchor={onFocusAnchor}
          onChangeLines={(next) => onChange({ ...value, inclusions: next })}
          addLabel={tp('tour-design', 'tplAdd')}
          removeTitle={tp('tour-design', 'tplRemoveLine')}
        />
        <LineList
          title={tp('tour-design', 'tplExclusions')}
          lines={exclusions}
          anchor="exclusions"
          onFocusAnchor={onFocusAnchor}
          onChangeLines={(next) => onChange({ ...value, exclusions: next })}
          addLabel={tp('tour-design', 'tplAdd')}
          removeTitle={tp('tour-design', 'tplRemoveLine')}
        />
      </section>

      <section id="tpl-booking" className="proposal-template-section">
        <div className="proposal-template-section-hd">{tp('tour-design', 'tplBooking')}</div>
        <label className="lbl">{isB2c ? tp('tour-design', 'tplPaymentTerms') : tp('tour-design', 'tplCommission')}</label>
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

        <label className="lbl">{tp('tour-design', 'tplValidUntil')}</label>
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
        <div className="proposal-template-section-hd">{tp('tour-design', 'tplPricingCopy')}</div>
        {isB2c ? (
          <>
            <label className="lbl">{tp('tour-design', 'tplPricingFootnote')}</label>
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
            <label className="lbl">{tp('tour-design', 'tplGroundDesc')}</label>
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
            <label className="lbl">{tp('tour-design', 'tplFlightsDesc')}</label>
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
            <label className="lbl">{tp('tour-design', 'tplQuotationFootnote')}</label>
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
        <div className="proposal-template-section-hd">{tp('tour-design', 'tplPolicies')}</div>
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
                  <span className="lbl">{tp('tour-design', policy.labelKey)}</span>
                  {!open && <span className="proposal-template-policy-excerpt">{excerpt(text, tp('tour-design', 'tplEmptyExcerpt'))}</span>}
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
