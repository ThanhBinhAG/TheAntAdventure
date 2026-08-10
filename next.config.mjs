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

const nextConfig = {
  reactStrictMode: true,
  // Smaller production image via `node server.js` (see Dockerfile).
  output: 'standalone',
  // Sharp is a native addon — keep it external so Next does not bundle/break its package exports.
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

export default withSentryConfig(nextConfig, {
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
