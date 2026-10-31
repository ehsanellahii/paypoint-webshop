import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * Metadata in the <head> for every visitor (31.10.2026). Next 16 streams
   * `generateMetadata` into the body for clients it does not list here, and
   * Googlebot is not on its default list — so the shop's favicon tag reached
   * Google after </head>, where it is ignored, and the Business Profile showed
   * our mark. Blocking on metadata costs nothing extra: the page needs the
   * same store request before it can render anyway.
   */
  htmlLimitedBots: /.*/,
  // Placeholder, but make sure to add whatever place you're hosting your images from
  images: {
    /*
     * Next defaults optimized images to `attachment`, which stops the
     * optimizer being used as a file host for drive-by downloads. That threat
     * needs an open allow-list; ours is the three hosts below and everything
     * comes back re-encoded as webp. Meanwhile the store favicon is served
     * from this same endpoint, and `attachment` on an icon is at best ignored
     * and at worst a tab with no icon — so images are declared as what they
     * are, something to display.
     */
    contentDispositionType: 'inline',
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
        hostname: 'paypoint-storage.s3.eu-central-1.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
