import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    turbopack: false,
  },
  webpackDevMiddleware: {
    watchOptions: {
      poll: false,
      ignored: /node_modules/,
    },
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;
