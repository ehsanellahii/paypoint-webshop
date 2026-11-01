/**
 * Where the integration API lives.
 *
 * Its own module because `proxy.ts` needs it too, and middleware is bundled
 * separately with a size limit — importing `lib/api.ts` there would drag the
 * whole storefront data layer and its types in behind this one string.
 * `lib/api.ts` re-exports it, so every existing import keeps working.
 */
export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.paypointpos.de/integration'
    : // Dev only: preview runs point this at a local proxy that rewrites answers.
      (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/integration');
