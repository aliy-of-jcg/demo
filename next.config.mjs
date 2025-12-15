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
  // Required for Docker / standalone deployments
  output: 'standalone',

  experimental: {
    // Needed for instrumentation.ts
    instrumentationHook: true,
  },

  webpack: (config, { isServer }) => {
    // Prevent Node.js built-in modules from being bundled in client code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js built-ins should never be in client bundle
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        zlib: false,
        path: false,
        os: false,
        string_decoder: false,
      };
    }

    // For server builds, mark server-only packages as external to prevent bundling
    // This is needed because instrumentation.ts imports them, and webpack tries to bundle them
    if (isServer) {
      const originalExternals = config.externals || [];

      // Use function-based externals to match request paths more precisely
      // This ensures mysql2 and all its subpaths (like mysql2/promise) are marked as external
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        // Match mysql2 and all its subpaths
        ({ request }, callback) => {
          if (request && (request === 'mysql2' || request.startsWith('mysql2/'))) {
            return callback(null, `commonjs ${request}`);
          }
          if (request && (request === '@clickhouse/client' || request.startsWith('@clickhouse/client'))) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
