import type { Metadata } from 'next';
import { headers } from 'next/headers';

import type { IStoreInfo } from './types';

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
  const url = `${origin}/${slug}${path}`;

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
    // `absolute` so the parent layout's title template does not append the
    // brand a second time.
    title: { absolute: heading },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: brand,
      title: heading,
      description,
      url,
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
