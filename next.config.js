const { imageHosts } = require('./image-hosts.config.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: false,
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/homepage',
        permanent: false,
      },
      {
        source: '/products',
        destination: '/magaza',
        permanent: true,
      },
    ];
  },
  webpack(config) {
    if (process.env.NODE_ENV === 'development') {
      try {
        require.resolve('@dhiwise/component-tagger/nextLoader');
        config.module.rules.push({
          test: /\.(jsx|tsx)$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: '@dhiwise/component-tagger/nextLoader',
            },
          ],
        });
      } catch (err) {
        // Safe fallback if loader is not present
      }
    }
    return config;
  },
};

module.exports = nextConfig;
