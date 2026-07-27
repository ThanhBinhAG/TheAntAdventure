'use client';

import Link from 'next/link';
import type { ResolvedPhoto } from '@/lib/tour-photos';
import { galleryUrlForProduct } from '@/lib/gallery-helpers';

interface Props {
  photos: ResolvedPhoto[];
  productCode?: string;
  height?: number;
  className?: string;
  showCaptions?: boolean;
}

export default function PhotoStack({ photos, productCode, height = 105, className = '', showCaptions = false }: Props) {
  const galleryHref = productCode ? galleryUrlForProduct(productCode) : null;

  if (!photos.length) return null;

  return (
    <div className={`td-photo-stack ${className}`.trim()}>
      {photos.map((p, i) => {
        const img = (
          <img
            src={p.thumbUrl || p.url}
            alt={p.caption || 'Experience photo'}
            loading="lazy"
            style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
        return (
          <div key={`${p.url}-${i}`} className="td-photo-stack-item" style={{ marginTop: i > 0 ? 5 : 0 }}>
            {galleryHref ? (
              <Link href={galleryHref} title="View in Photo Gallery" className="td-photo-stack-link">
                {img}
              </Link>
            ) : (
              img
            )}
            {showCaptions && p.caption && <div className="td-photo-caption">{p.caption}</div>}
          </div>
        );
      })}
    </div>
  );
}
