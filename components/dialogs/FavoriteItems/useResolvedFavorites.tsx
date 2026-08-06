'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveFavorites } from '~/lib/api';
import { FavoriteSnapshot, getFavorites, removeFavorites } from '~/lib/favorites';
import { MenuProduct } from '~/lib/utils';

type ProductCard = MenuProduct;
export function useResolvedFavorites(storeKey: string, enabled: boolean, storeId: string, adminId: string) {
  const [favorites, setFavorites] = useState<FavoriteSnapshot[]>([]);
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(false);

  // load from storage when dialog opens
  useEffect(() => {
    if (!enabled) return;
    setFavorites(getFavorites(storeKey));
  }, [storeKey, enabled]);

  const ids = useMemo(() => favorites.map((f) => f.productId), [favorites]);

  useEffect(() => {
    if (!enabled) return;
    if (ids.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await resolveFavorites(adminId, storeId, ids); // pass adminId if needed

        if (cancelled) return;

        const resolved: ProductCard[] = res?.products ?? [];
        const missingIds: string[] = res?.missingIds ?? [];

        setProducts(resolved);

        // Optional auto-clean:
        if (missingIds.length) {
          const nextList = removeFavorites(storeKey, missingIds);
          setFavorites(nextList);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeKey, enabled, ids, adminId, storeId]); // join keeps effect stable

  return { favorites, setFavorites, products, loading };
}
