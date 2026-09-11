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
 * `settings.logo` is the webshop logo the admin panel sets per store and
 * `logo` the firm-wide one, the same order the header resolves them in, so the
 * tab shows the picture the guest already sees on the page. Both are absolute
 * S3 URLs by the time they reach here — see `getImageURL`.
 *
 * A logo that is configured but fails to load cannot fall back: the browser
 * has already committed to the icon it was given and simply draws its own
 * placeholder. Only "no logo set" is recoverable, and that is what this covers.
 */
/*
 * Widths for the two jobs — the tab icon, and the icon iOS scales for the home
 * screen. Both have to be values `images.imageSizes` already allows, or the
 * optimizer answers 400 and the tab falls back to the browser's blank page
 * mark.
 */
const ICON_WIDTH = 64;
const APPLE_ICON_WIDTH = 256;

/**
 * The logo, resized to something a favicon should weigh.
 *
 * A restaurant uploads a full-size press image — the logo in production is a
 * 1 MB PNG — and a favicon pointing straight at it makes the browser download
 * the whole megabyte to draw sixteen square pixels. That is the second or two
 * the tab spends on the default icon before the logo appears. The same file
 * through the optimizer is a 6 KB webp, and it is cached from then on.
 *
 * SVG is handed through untouched: the optimizer rejects it unless
 * `dangerouslyAllowSVG` is set, and a vector logo is already small.
 */
function iconURL(logo: string, width: number): string {
  if (/\.svg(\?|$)/i.test(logo)) return logo;
  // Relative on purpose — `metadataBase` makes it absolute against whichever
  // host the guest arrived on, the restaurant's own domain included.
  return `/_next/image?url=${encodeURIComponent(logo)}&w=${width}&q=75`;
}

function storeIcons(store: IStoreInfo | null): Metadata['icons'] {
  const logo = store?.settings?.logo?.trim() || store?.logo?.trim();
  if (!logo) return FALLBACK_ICONS;
  // No `type`: the optimizer answers webp, the SVG path stays SVG, and a
  // wrong `type` is worse than none — browsers sniff it from the response.
  return { icon: [{ url: iconURL(logo, ICON_WIDTH) }], apple: [{ url: iconURL(logo, APPLE_ICON_WIDTH) }] };
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
    icons: storeIcons(store),
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
