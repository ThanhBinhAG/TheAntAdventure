/** @type {import('next').NextConfig} */

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
      const dup = patterns.some((p) => p.hostname === entry.hostname && (p.port ?? '') === (entry.port ?? ''));
      if (!dup) patterns.push(entry);
    } catch {
      /* ignore invalid URL */
    }
  }

  return patterns;
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
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
});
