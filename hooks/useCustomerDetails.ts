'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL, apiErrorFrom, apiHeaders, isAuthFailure } from '~/lib/api';
import { useStore } from '~/contexts/store-context';
import { useUser, type Voucher } from '~/contexts/user-context';

export type CustomerDetails = { points: number; vouchers: Voucher[] };

/** Per customer id, for the life of the tab — the account screens open and close often. */
const cache = new Map<string, CustomerDetails>();

/**
 * Points and the customer's own vouchers, read from the server when a screen
 * needs them.
 *
 * The session no longer keeps them (it stores only who the customer is, see
 * `sanitizeUser`), so the profile and the voucher list ask
 * `GET /customer/details/:id` with the customer's own token instead (server
 * 0051). `null` while signed out or while the first answer is on its way.
 */
export function useCustomerDetails(): CustomerDetails | null {
  const store = useStore();
  const { user, clearUser } = useUser();
  const id = user?._id ? String(user._id) : '';
  const token = user?.authToken ?? '';
  // Keyed by customer id, so a sign-out or another customer never sees stale data.
  const [entry, setEntry] = useState<{ id: string; data: CustomerDetails } | null>(null);

  useEffect(() => {
    if (!id || !token || !store?.apiKey) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/customer/details/${encodeURIComponent(id)}`, {
      headers: apiHeaders({ apiKey: store.apiKey, adminId: store.adminId, storeId: store.storeId, authToken: token }),
    })
      .then(async (response) => {
        if (!response.ok) throw await apiErrorFrom(response);
        return response.json();
      })
      .then((json) => {
        const data = json?.data ?? {};
        const next: CustomerDetails = {
          points: typeof data.points === 'number' ? data.points : 0,
          vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
        };
        cache.set(id, next);
        if (!cancelled) setEntry({ id, data: next });
      })
      .catch((error) => {
        // A token the server no longer accepts (e.g. one from before 0051):
        // sign out quietly, the screens then show their signed-out state.
        if (!cancelled && isAuthFailure(error)) clearUser();
      });
    return () => {
      cancelled = true;
    };
  }, [id, token, store?.apiKey, store?.adminId, store?.storeId, clearUser]);

  if (!id || !token) return null;
  const details = entry?.id === id ? entry.data : cache.get(id) ?? null;
  return details;
}
