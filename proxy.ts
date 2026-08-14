import { NextResponse, type NextRequest } from 'next/server';

/*
 * Device switch. Next 16 calls this a proxy — `proxy.ts` with a named `proxy`
 * export is the successor to `middleware.ts`.
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

export const DEVICE_HEADER = 'x-device';

export function proxy(request: NextRequest) {
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
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest)$).*)'],
};
