'use client';

import type { ReactElement } from 'react';
import { weatherGlyphKind, type WeatherGlyphKind } from '@/components/weather/weatherLabels';

type Props = {
  code: number;
  size?: number;
  className?: string;
  title?: string;
};

function SunIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="10" fill="currentColor" opacity="0.9" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect
          key={deg}
          x="22.5"
          y="4"
          width="3"
          height="8"
          rx="1.5"
          fill="currentColor"
          opacity="0.75"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="28" rx="14" ry="9" fill="currentColor" opacity="0.55" />
      <circle cx="16" cy="24" r="8" fill="currentColor" opacity="0.5" />
      <circle cx="28" cy="22" r="10" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="20" rx="13" ry="8" fill="currentColor" opacity="0.5" />
      <circle cx="17" cy="17" r="7" fill="currentColor" opacity="0.45" />
      <path d="M16 30 L14 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M24 31 L22 41" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      <path d="M32 30 L30 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function StormIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <ellipse cx="24" cy="18" rx="13" ry="8" fill="currentColor" opacity="0.55" />
      <path
        d="M26 24 L18 34 H24 L20 42 L32 30 H25 L26 24 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

function FogIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      {[16, 24, 32].map((y) => (
        <rect key={y} x="10" y={y} width="28" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
      ))}
    </svg>
  );
}

const ICONS: Record<WeatherGlyphKind, () => ReactElement> = {
  sun: SunIcon,
  cloud: CloudIcon,
  rain: RainIcon,
  storm: StormIcon,
  fog: FogIcon,
};

export default function WeatherIcon({ code, size = 48, className = '', title }: Props) {
  const kind = weatherGlyphKind(code);
  const Icon = ICONS[kind];
  return (
    <span
      className={`wg-weather-icon wg-weather-icon--${kind}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      title={title}
      role="img"
      aria-label={title || kind}
    >
      <Icon />
    </span>
  );
}
