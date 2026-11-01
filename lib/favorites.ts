import { storage } from '~/lib/utils';
import { mergeFavorites } from './api';

export type FavoriteSnapshot = {
  productId: string;
  addedAt: string; // ISO
  // Optional “snapshot” fields for quick UI rendering:
  name?: string;
  image?: string;
  price?: number;
};

type FavoritesState = {
  version: 1;
  // storeId (or store slug) -> favorites list
  byStore: Record<string, FavoriteSnapshot[]>;
};

const KEY = 'favorites_v1';

function readState(): FavoritesState {
  return (
    storage.get<FavoritesState>(KEY, {
      version: 1,
      byStore: {},
    }) ?? { version: 1, byStore: {} }
  );
}

function writeState(next: FavoritesState) {
  storage.set(KEY, next);
}

export function getFavorites(storeKey: string): FavoriteSnapshot[] {
  const state = readState();
  return state.byStore[storeKey] ?? [];
}

export function isFavorite(storeKey: string, productId: string): boolean {
  const list = getFavorites(storeKey);
  return list.some((x) => x.productId === productId);
}

export async function toggleFavorite({
  adminId,
  storeId,
  apiKey,
  customerId,
  authToken,
  slug,
  snapshot,
}: {
  adminId?: string;
  storeId?: string;
  /** Tenant key from the store payload; see `apiHeaders`. */
  apiKey?: string;
  customerId?: string;
  /** The signed-in customer's token — the favourites routes need it (server 0051). */
  authToken?: string;
  slug: string;
  snapshot: Omit<FavoriteSnapshot, 'addedAt'> & { productId: string };
}): Promise<{
  isNowFavorite: boolean;
  favorites: FavoriteSnapshot[];
  /** The server refused the token: the caller should sign the customer out. */
  authExpired?: boolean;
}> {
  const state = readState();
  const current = state.byStore[slug] ?? [];
  const exists = current.some((x) => x.productId === snapshot.productId);

  const nextList: FavoriteSnapshot[] = exists
    ? current.filter((x) => x.productId !== snapshot.productId)
    : [{ ...snapshot, addedAt: new Date().toISOString() }, ...current];

  const next: FavoritesState = {
    ...state,
    byStore: {
      ...state.byStore,
      [slug]: nextList,
    },
  };

  writeState(next);

  // Sync to the backend, only for a signed-in customer with a token.
  const shouldSync = !!adminId && !!storeId && !!customerId && !!authToken;
  let authExpired = false;

  if (shouldSync) {
    const nextIds = nextList.map((x) => x.productId);

    try {
      // merge adds missing (good for "add", doesn't remove on "remove")
      await mergeFavorites(adminId!, storeId!, apiKey ?? '', customerId!, nextIds, authToken);
    } catch (e: any) {
      // Don't break UX if network fails; local state stays
      authExpired = (e?.status === 401 && e?.code !== 'INVALID_API_KEY') || (e?.status === 403 && e?.code === 'FORBIDDEN');
    }
  }

  // Optional: keep UI in sync everywhere
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('favorites:changed'));
  }

  return { isNowFavorite: !exists, favorites: nextList, authExpired };
}

export function clearFavorites(storeKey: string) {
  const state = readState();
  const next: FavoritesState = {
    ...state,
    byStore: {
      ...state.byStore,
      [storeKey]: [],
    },
  };
  writeState(next);
}

export function removeFavorites(storeKey: string, productIds: string[]) {
  const state = readState();
  const current = state.byStore[storeKey] ?? [];
  const set = new Set(productIds);

  const nextList = current.filter((x) => !set.has(x.productId));

  const next: FavoritesState = {
    ...state,
    byStore: { ...state.byStore, [storeKey]: nextList },
  };

  writeState(next);
  return nextList;
}



export function setFavoritesFromIds(storeKey: string, productIds: string[]) {
  const nextList: FavoriteSnapshot[] = productIds.map((id) => ({
    productId: id,
    addedAt: new Date().toISOString(),
  }));

  const state = readState();
  const next: FavoritesState = {
    ...state,
    byStore: {
      ...state.byStore,
      [storeKey]: nextList,
    },
  };

  writeState(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('favorites:changed'));
  }

  return nextList;
}

export function getFavoriteIds(storeKey: string) {
  return getFavorites(storeKey).map((x) => x.productId);
}
