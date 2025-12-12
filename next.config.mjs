import createNextIntlPlugin from 'next-intl/plugin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bundleAnalyzer = require('@next/bundle-analyzer');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  webpack: (config, { isServer }) => {
    // Prevent Node.js built-in modules from being bundled in client code
    // Next.js already handles server-only npm packages correctly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js built-ins should never be in client bundle
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));

