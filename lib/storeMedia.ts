import type { IStoreInfo } from '~/lib/types';

/**
 * The image behind the menu hero, the auth panel and the zone gate.
 *
 * The design fills these with a wide photograph of the food. The store payload
 * has no such field yet (see `docs/backend-pending.md`), so until it does this
 * falls back to the logo, exactly as each screen used to do inline.
 *
 * Having it in one place means the day the backend sends a cover, all five
 * screens pick it up together instead of one being forgotten.
 */
export function getStoreCover(store: IStoreInfo | null | undefined): string {
  return store?.coverImage || store?.settings?.logo || store?.logo || '';
}
