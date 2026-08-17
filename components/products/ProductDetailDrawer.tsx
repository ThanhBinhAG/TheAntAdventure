'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/core/page-helpers';
import { photoThumbUrl, photosForProductSlots, productPhotoSlotStatus } from '@/lib/gallery/gallery-helpers';
import { resolveProductPhotos } from '@/lib/gallery/tour-photos';
import { pricingStatus, pricingUrlForProduct } from '@/lib/products/product-pricing-helpers';
import { getLibPriceLabel } from '@/lib/tour-design/tour-pricing';
import StorageImage from '@/components/gallery/StorageImage';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { Product } from '@/lib/types';

export type ProductDrawerMode = 'view' | 'preview';

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  mode?: ProductDrawerMode;
  onClose: () => void;
  onEdit?: (product: Product) => void;
}

const PRICING_BADGE: Record<string, { label: string; cls: string }> = {
  complete: { label: 'Pricing ✓', cls: 'bdg-g' },
  incomplete: { label: 'Pricing partial', cls: 'bdg-a' },
  missing: { label: 'No pricing', cls: 'bdg-r' },
};

export default function ProductDetailDrawer({
  product: p,
  open,
  mode = 'view',
  onClose,
  onEdit,
}: ProductDetailDrawerProps) {
  const isPreview = mode === 'preview';
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const storeProduct = useStore((s) => (p && !isPreview ? s.products.find((x) => x.code === p.code) : undefined));
  /** In preview mode, trust the draft as-is; in view mode, merge latest store row. */
  const product = useMemo(
    () => (isPreview ? p : p && storeProduct ? { ...p, ...storeProduct } : p),
    [isPreview, p, storeProduct]
  );
  const pricingRow = useStore((s) =>
    product?.code ? s.productPricing.find((r) => r.productCode === product.code) : undefined
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const heroImages = useMemo(() => {
    if (!product) return [];
    const { slot1, slot2 } = photosForProductSlots(photos, product);
    const fromGallery: { url: string; alt: string }[] = [];
    for (const slot of [slot1, slot2]) {
      if (!slot) continue;
      const url = photoThumbUrl(slot) || slot.url;
      if (url) fromGallery.push({ url, alt: slot.caption || product.name });
    }
    if (fromGallery.length >= 2) return fromGallery;
    const resolved = resolveProductPhotos(product, photos, 2);
    const seen = new Set(fromGallery.map((i) => i.url));
    for (const r of resolved) {
      const url = r.thumbUrl || r.url;
      if (url && !seen.has(url)) {
        fromGallery.push({ url, alt: r.caption || product.name });
        seen.add(url);
      }
    }
    return fromGallery;
  }, [photos, product]);

  if (!product) return null;

  const [rbg, rfg] = REG_COLORS_HEX[product.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  const priceLabel = product.price || (product.code ? getLibPriceLabel(product.code, 2) : '');
  const pStatus = pricingStatus(pricingRow);
  const photoStatus = productPhotoSlotStatus(product);
  const badge = PRICING_BADGE[pStatus];
  return (
    <>
      <div
        className={`tp-drawer-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`tp-drawer${open ? ' open' : ''}${isPreview ? ' tp-drawer--preview' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-drawer-title"
        aria-hidden={!open}
      >
        <header className="tp-drawer-hd">
          <div className="tp-drawer-hd-text">
            {isPreview && <div className="tp-drawer-preview-badge">Live preview</div>}
            {product.code && <code className="tp-drawer-code">{product.code}</code>}
            <h2 id="tp-drawer-title" className="tp-drawer-title">
              {product.name || 'Untitled product'}
            </h2>
            {product.dest && <div className="tp-drawer-dest">📍 {product.dest}</div>}
          </div>
          <button type="button" className="tp-drawer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="tp-drawer-scroll">
          <div className="tp-drawer-hero">
            <ProductHero
              key={`${open}-${product.code}-${product.photoIds?.join(',') ?? ''}-${product.linkedPhotoIds?.join(',') ?? ''}`}
              images={heroImages}
            />
          </div>

          <div className="tp-drawer-tags">
            <span className="prod-region-badge" style={{ background: rbg, color: rfg }}>
              {REG_LABELS[product.region as keyof typeof REG_LABELS] || product.region}
            </span>
            {product.dur && <span className="prod-tag-pill prod-tag-dur">{product.dur}</span>}
            {product.cat && <span className="prod-tag-pill prod-tag-cat">{product.cat}</span>}
            {product.lvl && <span className="prod-tag-pill prod-tag-lvl">{product.lvl}</span>}
            {(product.status === 'draft' || product.status === 'archived') && (
              <span className={`bdg ${product.status === 'draft' ? 'bdg-a' : 'bdg-r'}`}>{product.status}</span>
            )}
            <span className={`bdg ${badge.cls}`}>{badge.label}</span>
            {!photoStatus.complete && (
              <span className="bdg bdg-a">
                Photos {photoStatus.linked}/{photoStatus.needed}
              </span>
            )}
          </div>

          {priceLabel && <div className="tp-drawer-price">Price: {priceLabel}</div>}

          {product.desc?.trim() ? (
            <section className="tp-drawer-section">
              <h3 className="tp-drawer-section-title">Description</h3>
              <div className="tp-drawer-section-body">{product.desc}</div>
            </section>
          ) : isPreview ? (
            <section className="tp-drawer-section">
              <h3 className="tp-drawer-section-title">Description</h3>
              <div className="tp-drawer-section-body tp-edit-preview-empty">Add a description to see it here.</div>
            </section>
          ) : null}

          {product.usp?.trim() && (
            <section className="tp-drawer-section">
              <h3 className="tp-drawer-section-title">USP</h3>
              <div className="tp-drawer-section-body tp-drawer-usp">{product.usp}</div>
            </section>
          )}

          {product.notesToSales?.trim() && (
            <section className="tp-drawer-section tp-drawer-section--notes">
              <h3 className="tp-drawer-section-title">Notes to Sales</h3>
              <div className="tp-drawer-section-body tp-drawer-notes">{product.notesToSales}</div>
            </section>
          )}
        </div>

        {!isPreview && (
          <footer className="tp-drawer-ft">
            {product.code && (
              <Link href={pricingUrlForProduct(product.code)} className="btn btn-s btn-sm">
                Edit pricing
              </Link>
            )}
            {onEdit && (
              <button type="button" className="btn btn-p btn-sm" onClick={() => onEdit(product)}>
                Edit
              </button>
            )}
          </footer>
        )}
      </aside>
    </>
  );
}

function ProductHero({ images }: { images: { url: string; alt: string }[] }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const currentHero = images[heroIndex] ?? null;

  return (
    <>
      {currentHero ? (
        <StorageImage
          src={currentHero.url}
          alt={currentHero.alt}
          fill
          sizes="560px"
          className="tp-drawer-hero-img"
          unoptimized
        />
      ) : (
        <div className="tp-drawer-hero-placeholder">
          <span>🗺</span>
          <span>No photos yet</span>
        </div>
      )}
      {images.length > 1 && (
        <div className="tp-drawer-hero-dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`tp-drawer-hero-dot${i === heroIndex ? ' on' : ''}`}
              onClick={() => setHeroIndex(i)}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
