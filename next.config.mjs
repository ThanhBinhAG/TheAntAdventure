import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import { sanitizeSupabaseEnv } from './env/sanitize-supabase-env.mjs';

// When .env.local still points at Docker Supabase, restore company production URL/keys.
sanitizeSupabaseEnv();

function buildImageRemotePatterns() {
  const patterns = [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
    {
      protocol: 'https',
      hostname: 'picsum.photos',
      pathname: '/**',
    },
  ];

  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  if (raw) {
    try {
      const u = new URL(raw);
      const entry = {
        protocol: u.protocol.replace(':', ''),
        hostname: u.hostname,
        pathname: '/storage/v1/object/public/**',
      };
      if (u.port) entry.port = u.port;
      const duplicate = patterns.some(
        (pattern) => pattern.hostname === entry.hostname && (pattern.port ?? '') === (entry.port ?? '')
      );
      if (!duplicate) patterns.push(entry);
    } catch {
      /* ignore invalid URL */
    }
  }

  return patterns;
}

/** Native / heavy server packages — do not webpack-bundle (dev memory + runtime). */
const SERVER_EXTERNAL_PACKAGES = ['sharp', 'puppeteer-core', '@sparticuz/chromium', 'xlsx'];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // Smaller production image via `node server.js` (see Dockerfile).
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: SERVER_EXTERNAL_PACKAGES,
  },
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

const analyzedConfig = withBundleAnalyzer(nextConfig);

/**
 * Skip Sentry webpack plugin in local `next dev` unless explicitly enabled.
 * Wrapping always adds compile overhead and contributes to the ~10k-module memory pressure.
 * CI / production builds with SENTRY_AUTH_TOKEN (or SENTRY_ENABLED=1) still get sourcemaps upload.
 */
const useSentryWebpack =
  Boolean((process.env.SENTRY_AUTH_TOKEN ?? '').trim()) ||
  (process.env.SENTRY_ENABLED ?? '').trim() === '1';

export default useSentryWebpack
  ? withSentryConfig(analyzedConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },
      widenClientFileUpload: true,
      telemetry: false,
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
        automaticVercelMonitors: false,
      },
    })
  : analyzedConfig;
