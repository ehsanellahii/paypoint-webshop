/**
 * Image hosts the Next image optimiser may fetch from.
 *
 * Must match `images.remotePatterns` in next.config.ts. A picture from any
 * other host is shown as it is (unoptimised): next/image refuses an
 * unlisted host outright, and a broken picture is worse than a big one.
 */
export const OPTIMIZED_IMAGE_HOSTS = ['assets.byonesix.com', 'gymeyes.ams3.cdn.digitaloceanspaces.com', 'paypoint-storage.s3.eu-central-1.amazonaws.com'];

/** Can this `src` go through `/_next/image` (resized and re-encoded for the slot)? */
export function canOptimizeImage(src: unknown): boolean {
  // A static import is always ours.
  if (typeof src !== 'string') return true;
  if (!src) return false;
  // Our own public files, e.g. /logo.png.
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZED_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
