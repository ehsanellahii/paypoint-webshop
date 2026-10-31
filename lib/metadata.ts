import type { Metadata } from 'next';
import { headers } from 'next/headers';

import type { IStoreInfo } from './types';
import { getStoreBase } from './storeBase';

/**
 * Absolute origin of the current request.
 *
 * Social crawlers never run our JavaScript and do not resolve relative URLs, so
 * every og:/twitter: value has to be absolute in the HTML we serve. Reading the
 * origin off the request keeps localhost, a preview deploy and production all
 * correct without a build-time base URL that someone has to remember to update.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  // A proxy tells us what the visitor actually used; without one, only a local
  // address is safe to assume is plain http.
  const forwarded = h.get('x-forwarded-proto');
  const proto = forwarded ?? (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * The mark shown when the restaurant has no logo of its own.
 *
 * Two entries rather than one because the mark is drawn for a light and a dark
 * tab strip separately; the browser picks with the media query. Declared here
 * rather than in the layout so the fallback and the store's own icon are
 * decided in the same place.
 */
export const FALLBACK_ICONS: Metadata['icons'] = {
  icon: [
    { url: '/logo-light.svg', media: '(prefers-color-scheme: light)' },
    { url: '/logo-dark.svg', media: '(prefers-color-scheme: dark)' },
  ],
};

/**
 * The restaurant's logo in the browser tab, ours when they have not uploaded
 * one.
 *
 * Since 31.10.2026 the tags name the shop's own fixed icon URLs
 * (lib/storeIcon.ts) instead of an optimizer URL: Google only takes a favicon
 * that is square, a multiple of 48 px and on a stable address of the shop's
 * domain, and that is what those routes serve — the logo padded to a square.
 * `base` is '' on the restaurant's own domain and '/<slug>' on ours.
 */
function storeIcons(store: IStoreInfo | null, base: string): Metadata['icons'] {
  const logo = store?.settings?.logo?.trim() || store?.logo?.trim();
  if (!logo) return FALLBACK_ICONS;
  return {
    icon: [
      { url: `${base}/favicon.ico`, sizes: '48x48', type: 'image/png' },
      { url: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: `${base}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  };
}

type BuildArgs = {
  store: IStoreInfo | null;
  slug: string;
  /** Sub-path under the store, e.g. '/checkout'. */
  path?: string;
  /** Overrides the generated heading — used by checkout and confirmation. */
  title?: string;
};

/**
 * The tags a shared link is judged by.
 *
 * WhatsApp, iMessage, Slack, Twitter and the rest each read a slightly
 * different subset, so this fills all of them from one store payload rather
 * than letting each route guess.
 */
export async function buildStoreMetadata({ store, slug, path = '', title }: BuildArgs): Promise<Metadata> {
  const origin = await requestOrigin();
  // '' on the restaurant's own domain, '/<slug>' on ours.
  const base = await getStoreBase(slug);
  const url = `${origin}${base}${path}`;

  /*
   * A store on its own domain is reachable at two addresses — its domain and
   * the platform host it is still served from — and search engines treat that
   * as two competing copies of one page. The canonical always names the
   * restaurant's domain when it has one, so the branded address is the one
   * that gets indexed and the one a shared link shows, whichever the guest
   * happened to arrive on.
   */
  const canonical = store?.customDomain ? `https://${store.customDomain}${path}` : url;

  const brand = store?.brandName?.trim() || 'Online Ordering';
  const city = store?.city?.trim();
  const heading = title ?? (city ? `${brand} · ${city}` : brand);

  const streetLine = [store?.street?.trim(), store?.houseNumber?.trim()].filter(Boolean).join(' ');
  const cityLine = [store?.postalCode?.trim(), city].filter(Boolean).join(' ');
  const where = [streetLine, cityLine].filter(Boolean).join(', ');
  const description = where ? `Order online from ${brand} — ${where}.` : `Order online from ${brand}.`;

  /*
   * The same picture the header shows, so the preview matches the page people
   * land on. Falls back to our own mark rather than to nothing: a card with no
   * image collapses to a bare link in most chat apps.
   */
  const image = store?.settings?.logo || store?.logo || `${origin}/og-logo.png`;

  return {
    metadataBase: new URL(origin),
    icons: storeIcons(store, base),
    manifest: `${base}/site.webmanifest`,
    // `absolute` so the parent layout's title template does not append the
    // brand a second time.
    title: { absolute: heading },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: brand,
      title: heading,
      description,
      url: canonical,
      locale: 'de_DE',
      images: [{ url: image, alt: brand }],
    },
    twitter: {
      card: 'summary_large_image',
      title: heading,
      description,
      images: [image],
    },
  };
}
