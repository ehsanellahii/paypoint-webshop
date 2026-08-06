'use client';

import { useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

/**
 * Navigation between the store's screens (menu / checkout / confirmation).
 *
 * The dine-in table token arrives as `?t=` on the menu URL and must survive
 * every navigation, otherwise the store is re-resolved without its tableInfo
 * and a QR dine-in session silently becomes a normal order.
 */
export function useStoreNavigation() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params?.slug as string) || '';
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

  const toMenu = useCallback(() => router.push(withToken(`/${slug}`)), [router, slug, withToken]);
  const toCheckout = useCallback(() => router.push(withToken(`/${slug}/checkout`)), [router, slug, withToken]);
  const toConfirmation = useCallback((orderRef: string) => router.push(withToken(`/${slug}/confirmation`, { order: orderRef })), [router, slug, withToken]);

  return { slug, token, toMenu, toCheckout, toConfirmation, withToken };
}
