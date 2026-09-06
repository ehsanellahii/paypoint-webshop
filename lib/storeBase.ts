import { headers } from 'next/headers';

import { CUSTOM_DOMAIN_HEADER } from './requestHeaders';

/**
 * The prefix every in-app URL is built from.
 *
 * `/pizzeria-roma` on the platform hosts, where the slug is part of the
 * address, and `''` on a restaurant's own domain, where it is not. Routing is
 * already settled by then — `proxy.ts` rewrote the request, so `params.slug`
 * arrives either way. This governs only the URLs the page hands back out:
 * links, redirects, canonical tags, the Stripe return address.
 *
 * The slug is the fallback because it is what the app did before custom
 * domains existed and is always right on a platform host. It is used only if
 * the header is missing entirely, which means the request never passed through
 * the proxy.
 */
export async function getStoreBase(slug: string): Promise<string> {
  const h = await headers();
  return h.get(CUSTOM_DOMAIN_HEADER) ? '' : `/${slug}`;
}

/** The restaurant's own hostname if the request arrived on it, else null. */
export async function getCustomDomain(): Promise<string | null> {
  const h = await headers();
  return h.get(CUSTOM_DOMAIN_HEADER);
}
