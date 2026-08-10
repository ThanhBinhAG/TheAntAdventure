'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { isNextImageOptimizable } from '@/lib/gallery/storage-image-src';

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
  /** Bypass Next.js image optimizer (e.g. company branding — avoids stale /_next/image cache). */
  unoptimized?: boolean;
};

/**
 * Renders storage / remote images. When `src` changes (e.g. after replace + cache-bust),
 * keeps showing the previous frame until the new URL has loaded so placeholders / old
 * default backgrounds do not flash.
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
  unoptimized = false,
}: Props) {
  const [shownSrc, setShownSrc] = useState(src);

  useEffect(() => {
    if (!src || src === shownSrc) return;

    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setShownSrc(src);
    };
    probe.onerror = () => {
      if (cancelled) return;
      // Keep previous frame briefly; then adopt new src (CDN may still be catching up).
      if (!shownSrc) {
        setShownSrc(src);
        return;
      }
      fallbackTimer = setTimeout(() => {
        if (!cancelled) setShownSrc(src);
      }, 500);
    };
    probe.src = src;
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [src, shownSrc]);

  // No src → hide (do not clear shownSrc in an effect; that trips set-state-in-effect).
  if (!src || !shownSrc) return null;

  const useNext = !unoptimized && isNextImageOptimizable(shownSrc);

  const fillClass = className?.includes('gallery-img-contain')
    ? className
    : [className, 'gallery-img-cover'].filter(Boolean).join(' ');

  if (!useNext) {
    if (fill) {
      return (
        // Raw storage URLs are intentionally rendered without Next optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={shownSrc}
          src={shownSrc}
          alt={alt}
          className={fillClass}
          loading={loading}
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
      // Raw storage URLs are intentionally rendered without Next optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={shownSrc}
        src={shownSrc}
        alt={alt}
        className={className}
        width={width ?? 480}
        height={height ?? 320}
        loading={loading}
        style={style}
      />
    );
  }

  const shared = {
    src: shownSrc,
    alt,
    className: fill ? fillClass : className,
    style,
    loading,
    sizes,
  };

  if (fill) {
    return <Image key={shownSrc} {...shared} alt={alt} fill />;
  }

  return <Image key={shownSrc} {...shared} alt={alt} width={width ?? 480} height={height ?? 320} />;
}
