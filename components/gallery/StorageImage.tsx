'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { isNextImageOptimizable, toCrmPhotoAssetUrl } from '@/lib/gallery/storage-image-src';

type Props = {
  src?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  /** When false, one network fetch per URL (no preload probe). Default true. */
  holdUntilLoaded?: boolean;
  /** Bypass Next.js image optimizer (e.g. company branding — avoids stale /_next/image cache). */
  unoptimized?: boolean;
};

/**
 * Renders storage / remote images. When `holdUntilLoaded` (default), keeps the previous
 * frame until the new URL has loaded. Set `holdUntilLoaded={false}` on list tiles to
 * avoid a duplicate preload request per image.
 */
export default function StorageImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  style,
  loading = 'lazy',
  sizes,
  fetchPriority,
  holdUntilLoaded = true,
  unoptimized = false,
}: Props) {
  const [shownSrc, setShownSrc] = useState(src);

  useEffect(() => {
    if (!holdUntilLoaded) return;
    if (!src || src === shownSrc) return;

    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setShownSrc(src);
    };
    probe.onerror = () => {
      if (cancelled) return;
      if (!shownSrc) {
        setShownSrc(src);
        return;
      }
      fallbackTimer = setTimeout(() => {
        if (!cancelled) setShownSrc(src);
      }, 500);
    };
    // Keep preloading on the CRM origin too. Otherwise a dynamic image update
    // would bypass the authenticated BFF media route even though rendering does not.
    probe.src = toCrmPhotoAssetUrl(src);
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [src, shownSrc, holdUntilLoaded]);

  const activeSrc = holdUntilLoaded ? shownSrc : src;

  if (!activeSrc) return null;

  const renderedSrc = toCrmPhotoAssetUrl(activeSrc);

  const useNext = !unoptimized && isNextImageOptimizable(renderedSrc);

  const fillClass = className?.includes('gallery-img-contain')
    ? className
    : [className, 'gallery-img-cover'].filter(Boolean).join(' ');

  if (!useNext) {
    if (fill) {
      return (
        // This image is intentionally rendered without Next optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={renderedSrc}
          src={renderedSrc}
          alt={alt}
          className={fillClass}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          sizes={sizes}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: fillClass.includes('contain') ? 'contain' : 'cover',
            ...style,
          }}
        />
      );
    }
    return (
      // This image is intentionally rendered without Next optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={renderedSrc}
        src={renderedSrc}
        alt={alt}
        className={className}
        width={width ?? 480}
        height={height ?? 320}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        style={style}
      />
    );
  }

  const shared = {
    src: renderedSrc,
    alt,
    className: fill ? fillClass : className,
    style,
    loading,
    sizes,
  };

  if (fill) {
    return <Image key={renderedSrc} {...shared} alt={alt} fill />;
  }

  return <Image key={renderedSrc} {...shared} alt={alt} width={width ?? 480} height={height ?? 320} />;
}
