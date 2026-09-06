/**
 * Hostname handling for stores served on their own domain.
 *
 * The counterpart to `normalizeCustomDomain` in the API's
 * `src/utils/customDomain.ts`, which is what the stored value passed through.
 * The two must agree character for character: a hostname that normalises
 * differently here simply never matches a store, and the failure is a silent
 * 404 on the restaurant's live domain rather than an error anyone sees.
 */

/*
 * Hosts that are the platform rather than a restaurant. Everything else that
 * reaches this deployment is treated as a candidate custom domain and looked
 * up. Overridable so a preview deployment or a local tunnel can be added
 * without a code change.
 */
const PLATFORM_HOST_SUFFIXES = (process.env.PLATFORM_HOSTS ?? 'paypointpos.de,vercel.app,localhost,127.0.0.1')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

/**
 * The comparable form of a `Host` header.
 *
 * A Host header is already just an authority, so this is narrower than the
 * server's normaliser — no scheme or path to strip — but the port, the
 * trailing dot some resolvers add, and the `www.` prefix all have to go, and
 * the result has to match what the server stored.
 */
export function normalizeHost(value: string | null): string {
  const host = (value ?? '').trim().toLowerCase().split(':')[0] ?? '';
  return host.replace(/\.$/, '').replace(/^www\./, '');
}

export function isPlatformHost(host: string): boolean {
  return PLATFORM_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
}
