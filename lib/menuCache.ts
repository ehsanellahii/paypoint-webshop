import { fetchMenuData } from './api';
import type { IMenuData } from './utils';

/**
 * The menu, kept for the browser session per store and order type.
 *
 * The mobile shop is several routes — menu, product, cart — and each one used
 * to fetch the whole menu again on mount: opening a product cost a full menu
 * download, and coming back to the menu showed the skeleton and started at
 * the top again. One copy per store and order type now serves every screen.
 *
 * Browser only. On the server a module-level map would be shared between
 * every visitor of every store, so nothing is cached there.
 */

type Entry = { data?: IMenuData; at: number; promise?: Promise<IMenuData> };

const entries = new Map<string, Entry>();

/** How long a copy is served without asking again. Sold-out flags change. */
export const MENU_MAX_AGE_MS = 60_000;

export const menuCacheKey = (storeId: string, orderType: string) => `${storeId}:${orderType}`;

const inBrowser = () => typeof window !== 'undefined';

/** The cached menu for this key, however old, or null. */
export function peekMenu(key: string): IMenuData | null {
  if (!inBrowser() || !key) return null;
  return entries.get(key)?.data ?? null;
}

/**
 * The menu for a store and order type: the cached copy while it is fresh,
 * otherwise one request — shared by every caller that asks meanwhile.
 */
export function loadMenu({
  adminId,
  storeId,
  apiKey,
  orderType,
  maxAgeMs = MENU_MAX_AGE_MS,
}: {
  adminId: string;
  storeId: string;
  apiKey: string;
  orderType: string;
  maxAgeMs?: number;
}): Promise<IMenuData> {
  const key = menuCacheKey(storeId, orderType);
  if (!inBrowser()) return fetchMenuData(adminId, storeId, apiKey, orderType);

  const entry = entries.get(key);
  if (entry?.data && Date.now() - entry.at < maxAgeMs) return Promise.resolve(entry.data);
  if (entry?.promise) return entry.promise;

  const promise = fetchMenuData(adminId, storeId, apiKey, orderType).then(
    (data) => {
      entries.set(key, { data, at: Date.now() });
      return data;
    },
    (error) => {
      // Keep an older copy if there is one; drop only the failed request.
      const prev = entries.get(key);
      if (prev?.data) entries.set(key, { data: prev.data, at: prev.at });
      else entries.delete(key);
      throw error;
    },
  );
  entries.set(key, { ...(entry ?? { at: 0 }), promise });
  return promise;
}

/** For tests. */
export function clearMenuCache() {
  entries.clear();
}
