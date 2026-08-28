import bundleAnalyzer from '@next/bundle-analyzer';

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
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos', pathname: '/**' }],
  },
};

export default withBundleAnalyzer(nextConfig);
