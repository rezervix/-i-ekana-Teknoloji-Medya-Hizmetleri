const { imageHosts } = require('./image-hosts.config.cjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: '@dhiwise/component-tagger/nextLoader',
          },
        ],
      });
    }
    return config;
  },
};

module.exports = nextConfig;
