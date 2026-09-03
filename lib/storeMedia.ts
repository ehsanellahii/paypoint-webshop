import type { IStoreInfo } from '~/lib/types';

/**
 * The image behind the menu hero, the auth panel and the zone gate.
 *
 * The design fills these with a wide photograph of the food, set per store as
 * the web shop banner in the admin panel. A shop that has not uploaded one
 * falls back to its logo, exactly as each screen used to do inline — stretched
 * and dimmed, which works without ever looking deliberate.
 *
 * Having it in one place means all five screens agree on what the banner is.
 */
export function getStoreCover(store: IStoreInfo | null | undefined): string {
  return store?.coverImage || store?.settings?.logo || store?.logo || '';
}
