import bundleAnalyzer from '@next/bundle-analyzer';

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
const SERVER_EXTERNAL_PACKAGES = ['sharp', 'puppeteer-core', '@sparticuz/chromium', 'xlsx', 'pino'];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // Smaller production image via `node server.js` (see Dockerfile).
  output: 'standalone',
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons'],
  },
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

export default withBundleAnalyzer(nextConfig);
