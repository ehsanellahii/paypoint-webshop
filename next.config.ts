import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Placeholder, but make sure to add whatever place you're hosting your images from
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.byonesix.com',
      },
      {
        protocol: 'https',
        hostname: 'gymeyes.ams3.cdn.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: 'paypoint-web-storage.s3.eu-central-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'paypoint-storage.s3.eu-central-1.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
