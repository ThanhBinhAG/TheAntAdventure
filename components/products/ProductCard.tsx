'use client';

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { galleryUrlForProduct, productPhotoSlotStatus } from '@/lib/gallery-helpers';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import { pricingStatus, pricingUrlForProduct } from '@/lib/product-pricing-helpers';
import { getLibPriceLabel } from '@/lib/tour-pricing';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  pickMode?: boolean;
  expanded?: boolean;
  onToggleExpand?: (code: string) => void;
  onPick?: (p: Product) => void;
}

const PRICING_BADGE: Record<string, { label: string; cls: string }> = {
  complete: { label: 'Pricing ✓', cls: 'bdg-g' },
  incomplete: { label: 'Pricing partial', cls: 'bdg-a' },
  missing: { label: 'No pricing', cls: 'bdg-r' },
};

export default function ProductCard({
  product: p,
  pickMode = false,
  expanded = false,
  onToggleExpand,
  onPick,
}: ProductCardProps) {
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const pricingRow = useStore((s) => s.productPricing.find((r) => r.productCode === p.code));
  const [rbg, rfg] = REG_COLORS_HEX[p.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  const priceLabel = p.price || getLibPriceLabel(p.code, 2);
  const pStatus = pricingStatus(pricingRow);
  const photoStatus = productPhotoSlotStatus(photos, p.code);
  const badge = PRICING_BADGE[pStatus];

  const handleCardClick = () => {
    if (pickMode && onPick) onPick(p);
  };

  const handleNameClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (pickMode && onPick) {
      onPick(p);
      return;
    }
    onToggleExpand?.(p.code);
  };

  return (
    <div
      className={`prod-card${pickMode ? ' prod-pickable' : ''}${expanded ? ' expanded' : ''}`}
      onClick={pickMode ? handleCardClick : undefined}
      role={pickMode ? 'button' : undefined}
      tabIndex={pickMode ? 0 : undefined}
    >
      <div className="prod-card-tags">
        <code className="pl-code">{p.code}</code>
        <span className="prod-region-badge" style={{ background: rbg, color: rfg }}>
          {REG_LABELS[p.region as keyof typeof REG_LABELS] || p.region}
        </span>
        {p.dur && <span className="prod-tag-pill prod-tag-dur">{p.dur}</span>}
        {p.cat && <span className="prod-tag-pill prod-tag-cat">{p.cat}</span>}
        {p.lvl && <span className="prod-tag-pill prod-tag-lvl">{p.lvl}</span>}
        {(p.status === 'draft' || p.status === 'archived') && (
          <span className={`bdg ${p.status === 'draft' ? 'bdg-a' : 'bdg-r'}`}>{p.status}</span>
        )}
        <span className={`bdg ${badge.cls}`} title="Pricing library status">
          {badge.label}
        </span>
        {!photoStatus.complete && (
          <span className="bdg bdg-a" title="Tour preview photos">
            Photos {photoStatus.linked}/{photoStatus.needed}
          </span>
        )}
      </div>

      <button type="button" className="prod-card-name" onClick={handleNameClick}>
        {!pickMode && <span className="prod-card-chevron">{expanded ? '▾' : '▸'}</span>}
        {p.name}
      </button>

      {p.dest && <div className="prod-card-dest">📍 {p.dest}</div>}

      {!expanded && p.desc && (
        <div className="prod-card-snippet">{p.desc.slice(0, 200)}{p.desc.length > 200 ? '…' : ''}</div>
      )}

      {expanded && (
        <div className="prod-card-expanded">
          {p.desc && <div className="prod-card-snippet">{p.desc}</div>}
          {p.usp && <div className="prod-usp">{p.usp.replace(/\n/g, ' · ')}</div>}
          {p.notesToSales?.trim() && (
            <div className="prod-notes-sales">
              <div className="prod-notes-sales-label">Notes to Sales</div>
              <div className="prod-notes-sales-body">{p.notesToSales}</div>
            </div>
          )}
          <div className="prod-card-links" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <Link href={pricingUrlForProduct(p.code)} className="btn btn-s btn-sm" onClick={(e) => e.stopPropagation()}>
              Edit pricing
            </Link>
            <Link href={galleryUrlForProduct(p.code)} className="btn btn-s btn-sm" onClick={(e) => e.stopPropagation()}>
              Gallery ({photoStatus.linked}/{photoStatus.needed})
            </Link>
          </div>
        </div>
      )}

      {!expanded && p.usp && !pickMode && (
        <div className="prod-usp prod-usp-compact">{p.usp.slice(0, 150).replace(/\n/g, ' · ')}</div>
      )}

      {priceLabel && <div className="prod-card-price">Price: {priceLabel}</div>}
    </div>
  );
}
