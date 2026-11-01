import type { NextConfig } from 'next';

/*
 * Security headers on every response (1.11.2026).
 *
 * - framing: only by the shop itself. Nothing of ours embeds the shop, and a
 *   checkout inside someone else's frame is a clickjacking target. Stripe's
 *   own frames are unaffected — this governs who may frame *us*.
 * - no MIME sniffing, a referrer that stops at the origin cross-site, HTTPS
 *   remembered for a year (no `includeSubDomains`: restaurants' own domains
 *   are served here too, and their other subdomains are not ours to decide).
 * - location only for the shop's own pages ("use my location" in the address
 *   dialog); everything else keeps the browser default.
 * - payment for the shop and Stripe's frames (server 0052, Apple Pay / Google
 *   Pay): Stripe's Google Pay guide asks for exactly this header, as "some web
 *   clients, including Chrome on Android" need `self` in the payment allowlist.
 *   https://docs.stripe.com/google-pay?platform=web
 *
 * Deliberately no full Content-Security-Policy yet: Stripe (js.stripe.com,
 * its frames and 3-D Secure redirects), Google Maps and Places, Firebase Auth
 * (reCAPTCHA and the sign-in popups), S3 images and Google Fonts would all have
 * to be listed and proven in a browser first. `frame-ancestors` is the only
 * directive set, and it restricts nothing the page itself loads.
 */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")' },
];

const nextConfig: NextConfig = {
  // No `X-Powered-By: Next.js` — it tells a scanner which exploits to try.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
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
