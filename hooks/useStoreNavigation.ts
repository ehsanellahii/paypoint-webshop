'use client';

import { useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useStoreBase } from '~/contexts/store-base-context';

/**
 * Navigation between the store's screens (menu / checkout / confirmation).
 *
 * The dine-in table token arrives as `?t=` on the menu URL and must survive
 * every navigation, otherwise the store is re-resolved without its tableInfo
 * and a QR dine-in session silently becomes a normal order.
 *
 * Every path is built from `base`, which is `/<slug>` on the platform hosts
 * and empty on a restaurant's own domain. This is the only place the shape of
 * an in-app URL is decided, which is why serving a store on its own domain did
 * not have to touch the screens themselves.
 */
export function useStoreNavigation() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params?.slug as string) || '';
  // Null means no provider above, so fall back to the slug path the app has
  // always used.
  const base = useStoreBase() ?? `/${slug}`;
  const token = searchParams?.get('t') || '';

  const withToken = useCallback(
    (path: string, extra?: Record<string, string>) => {
      const qs = new URLSearchParams();
      if (token) qs.set('t', token);
      Object.entries(extra ?? {}).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const query = qs.toString();
      return query ? `${path}?${query}` : path;
    },
    [token]
  );

  const toMenu = useCallback(() => router.push(withToken(base || '/')), [router, base, withToken]);
  // Mobile-only routes: the same screens are modals on desktop, so these are
  // only ever pushed from the mobile tree.
  const toProduct = useCallback((productId: string) => router.push(withToken(`${base}/product/${productId}`)), [router, base, withToken]);
  const toCart = useCallback(() => router.push(withToken(`${base}/cart`)), [router, base, withToken]);
  const toAccount = useCallback((section: 'favorites' | 'orders' | 'vouchers') => router.push(withToken(`${base}/account/${section}`)), [router, base, withToken]);
  const back = useCallback(() => router.back(), [router]);
  const toCheckout = useCallback(() => router.push(withToken(`${base}/checkout`)), [router, base, withToken]);
  const toConfirmation = useCallback((orderRef: string) => router.push(withToken(`${base}/confirmation`, { order: orderRef })), [router, base, withToken]);

  return { slug, base, token, toMenu, toProduct, toCart, toAccount, toCheckout, toConfirmation, back, withToken };
}
