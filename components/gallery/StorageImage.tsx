'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
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
};

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
}: Props) {
  if (!src) return null;

  const useNext = isNextImageOptimizable(src);

  const fillClass = className?.includes('gallery-img-contain')
    ? className
    : [className, 'gallery-img-cover'].filter(Boolean).join(' ');

  if (!useNext) {
    if (fill) {
      return (
        <img
          src={src}
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
      <img
        src={src}
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
    src,
    alt,
    className: fill ? fillClass : className,
    style,
    loading,
    sizes,
  };

  if (fill) {
    return <Image {...shared} alt={alt} fill />;
  }

  return <Image {...shared} alt={alt} width={width ?? 480} height={height ?? 320} />;
}
