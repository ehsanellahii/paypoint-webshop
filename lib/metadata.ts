import type { Metadata } from 'next';
import { headers } from 'next/headers';

import type { IStoreInfo } from './types';
import { getStoreBase } from './storeBase';
import { translations } from './i18n';

/**
 * Absolute origin of the current request.
 *
 * Social crawlers never run our JavaScript and do not resolve relative URLs, so
 * every og:/twitter: value has to be absolute in the HTML we serve. Reading the
 * origin off the request keeps localhost, a preview deploy and production all
 * correct without a build-time base URL that someone has to remember to update.
 */
/*
 * A hostname (with an optional port) and nothing else. The value is a request
 * header, so it is checked before it is pasted into URLs: a header carrying a
 * path, credentials or a second URL falls back to the plain Host header.
 * Nothing fetches from this origin — the icons read their fallback from disk
 * (lib/storeIcon.ts) — it only names the page in its own metadata.
 */
const HOST_SHAPE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::\d{1,5})?$|^\[[0-9a-f:]+\](?::\d{1,5})?$/i;

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const first = (v: string | null) => (v ?? '').split(',')[0].trim();
  const forwardedHost = first(h.get('x-forwarded-host'));
  const plainHost = first(h.get('host'));
  const host = HOST_SHAPE.test(forwardedHost) ? forwardedHost : HOST_SHAPE.test(plainHost) ? plainHost : 'localhost:3000';
  // A proxy tells us what the visitor actually used; without one, only a local
  // address is safe to assume is plain http.
  const forwarded = first(h.get('x-forwarded-proto'));
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  const proto = forwarded === 'http' || forwarded === 'https' ? forwarded : isLocal ? 'http' : 'https';
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
/*
 * Pages that belong to one guest — the checkout, an order confirmation, the
 * account screens — are never indexed (robots.ts also asks crawlers to stay out).
 */
const PRIVATE_PATHS = ['/checkout', '/confirmation', '/account'];
const isPrivatePath = (path: string) => PRIVATE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

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
  /*
   * German, like `og:locale` below: the link preview is what a guest sees in
   * WhatsApp before opening the shop, and the shop opens in German. It was
   * English next to a de_DE locale (1.11.2026).
   */
  const de = translations.de;
  const description = (where ? de.metaDescriptionWithAddress : de.metaDescription).replace('{brand}', brand).replace('{address}', where);

  /*
   * The same picture the header shows, so the preview matches the page people
   * land on. Falls back to our own mark rather than to nothing: a card with no
   * image collapses to a bare link in most chat apps.
   */
  const image = store?.settings?.logo || store?.logo || `${origin}/og-logo.png`;

  return {
    metadataBase: new URL(origin),
    ...(isPrivatePath(path) ? { robots: { index: false, follow: false } } : {}),
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
