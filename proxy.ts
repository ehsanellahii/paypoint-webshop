import { NextResponse, type NextRequest } from 'next/server';

import { API_BASE_URL } from '~/lib/apiBase';
import { CUSTOM_DOMAIN_HEADER, DEVICE_HEADER } from '~/lib/requestHeaders';
import { isPlatformHost, normalizeHost } from '~/lib/hostname';

/*
 * Device switch and custom-domain routing. Next 16 calls this a proxy —
 * `proxy.ts` with a named `proxy` export is the successor to `middleware.ts`.
 *
 * The design handover ships mobile and desktop as two independent apps and
 * routes between them with a Netlify edge function. We serve one app with two
 * presentation trees, so the same decision is made here and handed to the
 * layout as `x-device` — the regex below is the handover's, unchanged, so both
 * deployments classify a given phone identically.
 *
 * `?view=mobile` / `?view=desktop` forces a version, matching the reference
 * site's test switch.
 */
const PHONE_UA = /Android.*Mobile|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini|Mobile.*Firefox/i;

// Re-exported so the previous import site keeps working; both names are
// defined in `lib/requestHeaders.ts`.
export { CUSTOM_DOMAIN_HEADER, DEVICE_HEADER };

/*
 * Host → slug, memoised.
 *
 * This runs on every request that reaches a page, so the lookup cannot be a
 * network round trip each time. A module-level Map lives as long as the
 * serverless instance that holds it: a cold start re-fetches, which is the
 * cost of one request, and warm instances answer from memory.
 *
 * Misses are cached too, and for a shorter time — a domain that has been
 * pointed at us but not yet configured is the normal state during onboarding,
 * and it must start working within a minute of the field being set rather than
 * five.
 */
type CacheEntry = { slug: string | null; expires: number };
const domainCache = new Map<string, CacheEntry>();
const HIT_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 60_000;
const ERROR_TTL_MS = 10_000;

async function resolveSlugForHost(host: string): Promise<string | null> {
  const cached = domainCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.slug;

  try {
    const response = await fetch(`${API_BASE_URL}/domains/${encodeURIComponent(host)}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      /*
       * The storefront must not hang on a slow API. Two seconds is far longer
       * than the lookup needs and short enough that a stalled backend costs a
       * failed request rather than a held connection.
       */
      signal: AbortSignal.timeout(2000),
    });

    if (response.status === 404) {
      domainCache.set(host, { slug: null, expires: Date.now() + MISS_TTL_MS });
      return null;
    }
    if (!response.ok) throw new Error(`Domain lookup failed: ${response.status}`);

    const body = await response.json();
    const slug = body?.data?.slug ?? null;
    domainCache.set(host, { slug, expires: Date.now() + (slug ? HIT_TTL_MS : MISS_TTL_MS) });
    return slug;
  } catch {
    /*
     * A backend fault is not proof the domain is unknown, so it is remembered
     * only briefly — long enough to stop a hard outage turning into a request
     * storm, short enough that the site returns as soon as the API does.
     */
    domainCache.set(host, { slug: null, expires: Date.now() + ERROR_TTL_MS });
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const view = request.nextUrl.searchParams.get('view');
  const isPhone = PHONE_UA.test(request.headers.get('user-agent') ?? '');
  const device = view === 'mobile' || (view !== 'desktop' && isPhone) ? 'mobile' : 'desktop';

  const headers = new Headers(request.headers);
  headers.set(DEVICE_HEADER, device);

  /*
   * No `Vary: User-Agent` here on purpose. The HTML does differ by device, so
   * a shared cache keyed only on the URL would be wrong — but Next already
   * sends `Cache-Control: private, no-store` on these dynamic pages, so no
   * shared cache stores them in the first place. Setting `Vary` here also does
   * not survive: Next rewrites the header for RSC negotiation.
   * If these routes ever become cacheable, `Vary` has to come back with them.
   */
  const host = normalizeHost(request.headers.get('host'));
  if (!host || isPlatformHost(host)) {
    return NextResponse.next({ request: { headers } });
  }

  const slug = await resolveSlugForHost(host);
  /*
   * An unrecognised domain falls through untouched. Anyone can point a DNS
   * record at this deployment, and the honest answer to a hostname we have
   * never been told about is the same not-found page an unknown slug gets —
   * not an error, and certainly not somebody else's restaurant.
   */
  if (!slug) return NextResponse.next({ request: { headers } });

  const { pathname } = request.nextUrl;

  /*
   * The slug still works on the custom domain, by redirecting rather than
   * serving: a link built before the domain existed, or one of the desktop
   * redirects in the route files, would otherwise be rewritten to
   * `/<slug>/<slug>/…` and resolve to nothing. Sending it to the clean address
   * also keeps one page from being reachable at two URLs.
   */
  if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
    const target = request.nextUrl.clone();
    target.pathname = pathname.slice(slug.length + 1) || '/';
    return NextResponse.redirect(target, 308);
  }

  headers.set(CUSTOM_DOMAIN_HEADER, host);

  /*
   * A rewrite, not a redirect: the guest keeps the restaurant's address while
   * the app routes exactly as it always has, `params.slug` included. Every
   * store lookup, cart and address storage key and the dine-in table token
   * carry on working untouched — only the URLs the page *emits* have to drop
   * the prefix, which is what `CUSTOM_DOMAIN_HEADER` tells them to do.
   */
  const target = request.nextUrl.clone();
  target.pathname = `/${slug}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest)$).*)'],
};
