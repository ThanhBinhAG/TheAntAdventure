'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/core/page-helpers';
import { photoThumbUrl, photosForProductSlots, productPhotoSlotStatus } from '@/lib/gallery/gallery-helpers';
import { resolveProductPhotos } from '@/lib/gallery/tour-photos';
import { pricingStatus } from '@/lib/products/product-pricing-helpers';
import { getLibPriceLabel } from '@/lib/tour-design/tour-pricing';
import StorageImage from '@/components/gallery/StorageImage';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  pickMode?: boolean;
  preview?: boolean;
  onOpenDetail?: (code: string) => void;
  onPick?: (p: Product) => void;
}

export default function ProductCard({
  product: p,
  pickMode = false,
  preview = false,
  onOpenDetail,
  onPick,
}: ProductCardProps) {
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const storeProduct = useStore((s) => s.products.find((x) => x.code === p.code));
  const product = useMemo(() => (storeProduct ? { ...p, ...storeProduct } : p), [p, storeProduct]);
  const pricingRow = useStore((s) => s.productPricing.find((r) => r.productCode === p.code));
  const [rbg, rfg] = REG_COLORS_HEX[p.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  const priceLabel = p.price || getLibPriceLabel(p.code, 2);
  // The catalogue no longer hydrates all pricing rows at page boot. Do not
  // label an unloaded row as "missing"; the accurate status is shown after
  // the detail/Manage lazy load.
  const pStatus = pricingRow ? pricingStatus(pricingRow) : null;
  const photoStatus = productPhotoSlotStatus(product);

  const heroUrl = useMemo(() => {
    if (preview && !p.code) return null;
    const { slot1 } = photosForProductSlots(photos, product);
    if (slot1) {
      const thumb = photoThumbUrl(slot1);
      if (thumb) return thumb;
    }
    const resolved = resolveProductPhotos(product, photos, 1);
    return resolved[0]?.thumbUrl || resolved[0]?.url || null;
  }, [photos, product, preview, p.code]);

  const metaTags = [p.dur, p.cat].filter(Boolean).slice(0, 2);

  const handleClick = () => {
    if (preview) return;
    if (pickMode && onPick) {
      onPick(p);
      return;
    }
    onOpenDetail?.(p.code);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (preview) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={`tp-card${pickMode ? ' tp-card--pickable' : ''}${preview ? ' tp-card--preview' : ''}`}
      onClick={preview ? undefined : handleClick}
      onKeyDown={preview ? undefined : handleKeyDown}
      role={preview ? undefined : 'button'}
      tabIndex={preview ? undefined : 0}
      aria-label={p.name}
    >
      <div className="tp-card-media">
        {heroUrl ? (
          <StorageImage
            src={heroUrl}
            alt={p.name}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="tp-card-img"
            unoptimized
          />
        ) : (
          <div className="tp-card-media-placeholder" aria-hidden>
            <span className="tp-card-media-icon">🗺</span>
          </div>
        )}
        <span className="tp-card-region" style={{ background: rbg, color: rfg }}>
          {REG_LABELS[p.region as keyof typeof REG_LABELS] || p.region}
        </span>
        {!photoStatus.complete && (
          <span className="tp-card-photo-badge" title="Featured photos (need 2 for catalog)">
            {photoStatus.linked}/{photoStatus.needed}
          </span>
        )}
        {pStatus && pStatus !== 'complete' && (
          <span className={`tp-card-pricing-badge tp-card-pricing-badge--${pStatus}`} title="Pricing status">
            {pStatus === 'missing' ? 'No $' : 'Partial'}
          </span>
        )}
      </div>

      <div className="tp-card-body">
        <h3 className="tp-card-title">{p.name}</h3>
        {p.dest && <div className="tp-card-dest">{p.dest}</div>}
        {metaTags.length > 0 && (
          <div className="tp-card-meta">
            {metaTags.map((tag, i) => (
              <span key={tag}>
                {i > 0 && <span className="tp-card-meta-sep">·</span>}
                {tag}
              </span>
            ))}
          </div>
        )}
        {priceLabel && <div className="tp-card-price">{priceLabel}</div>}
      </div>
    </article>
  );
}
