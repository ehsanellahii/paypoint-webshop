import { cache } from 'react';
import { getImageURL, IMenuData, MenuCategory, MenuProduct } from './utils';

import { API_BASE_URL } from './apiBase';

export { API_BASE_URL };
/** Payments and Connect live outside the /integration mount. */
export const PAYMENTS_BASE_URL = API_BASE_URL.replace(/\/integration$/, '/payments');
export const PAYMENT_API_KEY = process.env.NEXT_PUBLIC_PAYMENT_API_KEY ?? '';

/**
 * Headers for a storefront call.
 *
 * `apiKey` is the tenant key the slug endpoint hands back for the store being
 * shown — see `getStoreData`. It carries the tenant on the integration routes,
 * so a call made without it reaches the server as the wrong restaurant.
 *
 * Built fresh per call on purpose. This used to be one shared object that each
 * function mutated with the current tenant and store, which meant whatever the
 * last caller set leaked into every later request that reused it — including
 * server-rendered ones serving a different store.
 */
export function apiHeaders(opts: { apiKey?: string; adminId?: string; storeId?: string } = {}) {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (opts.apiKey) headers['x-api-key'] = opts.apiKey;
  if (opts.adminId) headers['x-paypoint-tenant-id'] = opts.adminId;
  if (opts.storeId) headers['x-paypoint-store-id'] = opts.storeId;
  return headers;
}

export const getStoreData = cache(async (slug: string, token?: string) => {
  if (!slug) return null;
  const tokenParam = token ? `?token=${token}` : '';
  // Public, and the source of the key itself — so it sends none.
  const response = await fetch(`${API_BASE_URL}/slugs/${slug}${tokenParam}`, {
    headers: apiHeaders(),
    cache: 'no-store',
  });
  /*
   * A slug that names no store is a normal outcome, not a fault. Every asset
   * the browser guesses at on a first visit — /favicon.ico, /apple-touch-icon.png —
   * has no file to match and lands on this route, and throwing here turned each
   * one into an error in the log while the real page rendered fine beside it.
   * Callers turn null into notFound(); only a genuine backend fault should
   * reach the error boundary.
   */
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to fetch store data');
  }
  const data = await response.json();
  /*
   * An allow-list, not a spread: the endpoint returns the whole store document
   * (bank details included), and only what is listed here reaches the browser.
   * A new field is therefore invisible on the storefront until it is added
   * below, however correctly the API sends it.
   */
  return {
    brandName: data?.data?.brandName,
    /** Branch name — `brandName` above is the firm. */
    name: data?.data?.name || '',
    about: data?.data?.about || '',
    cuisineTags: data?.data?.cuisineTags || [],
    priceLevel: data?.data?.priceLevel || '',
    /** Store-wide fallback ETA; per-zone values ride on `postalRates`. */
    deliveryTime: data?.data?.deliveryTime ?? null,
    website: data?.data?.website || '',
    mobileNumber: data?.data?.mobileNumber || '',
    address: data?.data?.address,
    street: data?.data?.street,
    houseNumber: data?.data?.houseNumber,
    postalCode: data?.data?.postalCode,
    city: data?.data?.place,
    phone: data?.data?.phone,
    email: data?.data?.emailAddress,
    logo: data?.data?.logoFileName ? `${getImageURL(data?.data?.logoFileName)}` : null,
    // `coverFileName` is read as well as `webShopSettings.coverImage` because
    // the two endpoints that answer for a store name it differently.
    coverImage: data?.data?.coverFileName || data?.data?.webShopSettings?.coverImage ? `${getImageURL(data?.data?.coverFileName || data?.data?.webShopSettings?.coverImage)}` : null,
    timings: data?.data?.timings || null,
    /*
     * Gates the online payment methods. Deliberately defaulted to false: a
     * store whose payload predates this field, or whose Stripe link is broken,
     * should offer cash rather than take the customer through a payment that
     * cannot succeed.
     */
    stripeChargesEnabled: !!data?.data?.stripeChargesEnabled,
    slug: slug,
    /*
     * The store's own hostname, when it has one. Present even when the guest
     * arrived on the platform host — that is exactly the case where the
     * canonical URL has to point somewhere other than the current address.
     */
    customDomain: data?.data?.customDomain || null,
    settings: data?.data?.webShopSettings
      ? {
          ...data?.data?.webShopSettings,
          logo: data?.data?.webShopSettings?.logo ? `${getImageURL(data?.data?.webShopSettings?.logo)}` : null,
        }
      : null,
    coordinates:
      data?.data?.coordinates?.latitude != null && data?.data?.coordinates?.longitude != null
        ? { latitude: data.data.coordinates.latitude, longitude: data.data.coordinates.longitude }
        : null,
    adminGoogleApiKey: data?.data?.adminGoogleApiKey || '',
    posGoogleApiKey: data?.data?.posGoogleApiKey || '',
    postalRates: data?.data?.postalRates || [],
    storeId: data?.data?._id || '',
    adminId: data?.data?.adminId || '',
    /*
     * The tenant key for this store, minted by the server per request. Every
     * other storefront call carries it so the server resolves the right
     * restaurant — a call without it lands on whatever tenant the old
     * hardcoded key named.
     */
    apiKey: data?.data?.apiKey || '',
    tableInfo: {
      token: data?.data?.tableInfo?.token || '',
      areaId: data?.data?.tableInfo?.areaId || '',
      areaName: data?.data?.tableInfo?.areaName || '',
      tableId: data?.data?.tableInfo?.tableId || 0,
      tableNumber: data?.data?.tableInfo?.tableNumber || 0,
    },
  };
});

export const resolveFavorites = async (adminId: string, storeId: string, apiKey: string, productIds: string[]) => {
  if (!storeId || productIds.length === 0 || !adminId) {
    return { products: [], missingIds: [] };
  }

  const response = await fetch(`${API_BASE_URL}/favorites/resolve`, {
    method: 'POST',
    headers: apiHeaders({ apiKey, adminId, storeId }),
    body: JSON.stringify({ productIds }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to resolve favorites');
  }

  const apiRes = await response.json();
  const data = apiRes?.data;
  return {
    products: data?.products || [],
    missingIds: data?.missingIds || [],
  };
};

export const syncFavorites = async (adminId: string, storeId: string, apiKey: string, customerId: string, productIds: string[]) => {
  if (!adminId || !storeId || !customerId) {
    throw new Error('Admin ID, Store ID, and Customer ID are required to sync favorites.');
  }

  const response = await fetch(`${API_BASE_URL}/favorites/sync`, {
    method: 'POST',
    headers: apiHeaders({ apiKey, adminId, storeId }),
    body: JSON.stringify({ customerId, productIds }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to sync favorites');
  }
  const data = await response.json();
  return data?.data;
};

/**
 * Cart recommendations ("customers who ordered these also ordered ...").
 * Backed by the server's co-purchase product pairings. Returns [] on failure so
 * the cart can fall back to a simple menu slice.
 */
export const fetchCartRecommendations = async (adminId: string, storeId: string, apiKey: string, productIds: string[], limit = 8): Promise<MenuProduct[]> => {
  if (!adminId || !storeId) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/recommendations/cart`, {
      method: 'POST',
      headers: apiHeaders({ apiKey, adminId, storeId }),
      body: JSON.stringify({ productIds, limit }),
      cache: 'no-store',
    });

    if (!response.ok) return [];

    const apiRes = await response.json();
    return (apiRes?.data ?? []) as MenuProduct[];
  } catch (error) {
    console.error('Error fetching cart recommendations:', error);
    return [];
  }
};

/**
 * The menu, priced for how this order is being placed.
 *
 * `orderType` matters whenever the shop prices collection and delivery apart:
 * the server resolves the prices it sends, so asking without it shows counter
 * prices on what may become a delivery order. It is part of the URL rather
 * than a header so Next's fetch cache keeps one entry per order type instead
 * of serving whichever was fetched first.
 */
export const fetchMenuData = async (adminId?: string, storeId?: string, apiKey?: string, orderType?: string) => {
  if (!adminId || !storeId) {
    throw new Error('Admin ID and Store ID are required to fetch menu data.');
  }
  const API_URL = orderType ? `${API_BASE_URL}/menu?orderType=${encodeURIComponent(orderType)}` : `${API_BASE_URL}/menu`;

  try {
    const response = await fetch(API_URL, {
      headers: apiHeaders({ apiKey, adminId, storeId }),
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      // get the message from the response body
      const errorData = await response.json();
      console.error('Error response data:', errorData);
      throw new Error(errorData.message ?? `Failed to fetch menu data: ${response.status}`);
    }

    const data: IMenuData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching menu data:', error);
    throw error;
  }
};

export type DeliveryZone = {
  /** Whether the store delivers here. A store with no zones set delivers everywhere. */
  isAvailable: boolean;
  /** False when the store has configured no zones at all. */
  hasZones: boolean;
  postalCode: string;
  deliveryCharges: number | null;
  minimumOrderAmount: number | null;
  deliveryTime: number | null;
  priorityDeliveryCharges: number | null;
  priorityDeliveryTime: number | null;
};

/**
 * Ask the server whether this postal code is in the store's delivery area.
 *
 * The browser used to decide this from the rate table shipped with the page,
 * comparing with a strict `===` against a Number — so a stored code that was a
 * string, or one with a leading zero, silently read as "outside our delivery
 * area". The server pads and compares both sides the same way, and it is the
 * only place that decision is now made.
 */
export const checkDeliveryZone = async (
  adminId: string,
  storeId: string,
  apiKey: string,
  postalCode: string,
): Promise<DeliveryZone> => {
  const url = `${API_BASE_URL}/delivery-zone?postalCode=${encodeURIComponent(postalCode)}`;
  const response = await fetch(url, { headers: apiHeaders({ apiKey, adminId, storeId }) });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message ?? `Delivery zone lookup failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.data;
};

export const loginUser = async (adminId: string, storeId: string, apiKey: string, phoneNumberWithCode: string, name?: string) => {
  const API_URL = `${API_BASE_URL}/user/login`;
  // `name` is optional server-side; sending it updates the stored customer name.
  const requestBody = { phoneNumber: phoneNumberWithCode, signInSource: 'web', signInWith: 'phone', ...(name ? { name } : {}) };
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders({ apiKey, adminId, storeId }),
      body: JSON.stringify({
        ...requestBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response data:', errorData);
      const error = new Error(errorData.message ?? `Login failed: ${response.status}`);
      /*
       * The status and the server's own code travel with the error. Callers
       * need to tell "this number has no account yet" apart from "the login
       * broke", and the message alone is a translated sentence that cannot be
       * matched on safely.
       */
      (error as any).status = response.status;
      (error as any).errorCode = errorData?.errorCode;
      throw error;
    }

    const data = await response.json();
    return data?.data; // assuming the user object is in data.data
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

/**
 * Placeholder name for a customer we have nothing better for.
 *
 * `customer.name` is `required: true` on the server, so registration has to
 * send something. Shared with checkout so the two cannot drift apart.
 */
export const CUSTOMER_NAME_PLACEHOLDER = '********';

/**
 * Sign a customer in, and create the account when the number is new.
 *
 * The OTP has already proved the number by the time this runs, so an unknown
 * one is a first-time customer rather than a failure. `/user/login` answers
 * those with 404 `CUSTOMER_NOT_FOUND`, which used to surface as "customer not
 * found" directly under a code the customer had just entered correctly — and
 * it hit new customers only, which is precisely the wrong half.
 */
export const loginOrRegisterUser = async (
  adminId: string,
  storeId: string,
  apiKey: string,
  phoneNumberWithCode: string,
  name?: string,
) => {
  try {
    return await loginUser(adminId, storeId, apiKey, phoneNumberWithCode, name);
  } catch (error: any) {
    const isUnknownNumber = error?.status === 404 || error?.errorCode === 'CUSTOMER_NOT_FOUND';
    if (!isUnknownNumber) throw error;

    return await registerUser(
      adminId,
      storeId,
      apiKey,
      name?.trim() || CUSTOMER_NAME_PLACEHOLDER,
      phoneNumberWithCode,
    );
  }
};

/**
 * Log in a customer who signed in with Google or Apple.
 *
 * `loginCustomerOnly` matches on phone **or** email, so an address is enough to
 * find or create the customer — social providers never give us a phone number.
 * `signInWith` records which provider it was, alongside the existing 'phone'.
 */
export const loginUserWithProvider = async (
  adminId: string,
  storeId: string,
  apiKey: string,
  { email, name, provider }: { email: string; name?: string; provider: 'google' | 'apple' },
) => {
  const API_URL = `${API_BASE_URL}/user/login`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders({ apiKey, adminId, storeId }),
    body: JSON.stringify({
      email,
      signInSource: 'web',
      signInWith: provider,
      ...(name ? { name } : {}),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message ?? `Login failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.data;
};

export const registerUser = async (adminId: string, storeId: string, apiKey: string, name: string, phoneNumberWithCode: string) => {
  const API_URL = `${API_BASE_URL}/user/register`;
  const requestBody = { name, phoneNumber: phoneNumberWithCode, signInSource: 'web', signInWith: 'phone' };
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders({ apiKey, adminId, storeId }),
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response data:', errorData);
      throw new Error(errorData.message ?? `Registration failed: ${response.status}`);
    }
    const data = await response.json();
    return data?.data; // assuming the user object is in data.data
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

export const mergeFavorites = (adminId: string, storeId: string, apiKey: string, customerId: string, productIds: string[]) => {
  const API_URL = `${API_BASE_URL}/favorites/merge`;

  return fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders({ apiKey, adminId, storeId }),
    body: JSON.stringify({ customerId, productIds }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to merge favorites');
      }
      return response.json();
    })
    .then((data) => data?.data)
    .catch((error) => {
      console.error('Error merging favorites:', error);
      throw error;
    });
};

// Utility functions to process menu data

export function getCategories(siteData: IMenuData): MenuCategory[] {
  return siteData.data.filter((category) => category.products.length > 0);
}

export function getAllProducts(siteData: IMenuData): MenuProduct[] {
  const products: MenuProduct[] = [];
  siteData.data.forEach((category) => {
    // if (!category.deleted_at) {
    //   category.products.forEach((product) => {
    //     products.push(product);
    //   });
    // }
    category.products.forEach((product) => {
      products.push(product);
    });
  });
  return products;
}

export function getProductsByCategory(siteData: IMenuData, categoryId: string): MenuProduct[] {
  const category = siteData.data.find((cat) => cat.id === categoryId);
  return category ? category.products : [];
}

// export function formatPrice(price: number): string {
//   return `€${price.toFixed(2).replace('.', ',')}`;
// }
export const formattedEuroValue = (amount: any) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};
export const formatPrice = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return '';

  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '';
  if (numValue === 0) return '0,00 €';

  let finalValue;
  if (numValue % 1 !== 0) {
    finalValue = numValue.toFixed(2);
  } else {
    finalValue = numValue.toString();
  }

  return formattedEuroValue(finalValue);
};

// export const restaurantInfo: RestaurantInfo = {
//   name: 'Fat Phills The Mall',
//   logo: '/og-logo.png',
//   address: 'Weigelia 19',
//   city: 'Leidschendam',
//   postalCode: '2262 AB',
//   openUntil: '22:50',
//   flag: '🇬🇧',
//   mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=52.089002,4.381865',
// };

// export function getDisplayName(item: { name: string; translations: Array<{ name: string | null; language_id: string }> }, languageId: string = 'en'): string {
//   const translation = item.translations.find((t) => t.language_id === languageId);
//   return translation?.name || item.name;
// }

// export function isRestaurantClosed(): boolean {
//   const now = new Date();
//   const currentTime = now.getHours() * 100 + now.getMinutes();

//   const [closeHour, closeMin] = restaurantInfo.openUntil.split(':').map(Number);
//   const closeTime = closeHour * 100 + closeMin;

//   return currentTime >= closeTime;
// }

// Hack to get data straight from the original site
// const API_BASE_URL = 'https://api.byonesix.com/api/v2';
// const API_HEADERS = {
//   'accept': 'application/json',
//   'accept-language': 'en-US,en;q=0.9',
//   'content-type': 'application/json',
//   'x-gymeyes-location-id': '2663286490888410897',
//   'x-gymeyes-setup-id': '2668345815931557019',
//   'x-gymeyes-token': '1D97BCC8-4B8A-4A8D-989D-152452674AD4',
// };

// export async function fetchMenuData(): Promise<SiteData> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/menu`, {
//       headers: apiHeaders({ apiKey, adminId, storeId }),
//       next: { revalidate: 60 },
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to fetch menu data: ${response.status}`);
//     }

//     const data: SiteData = await response.json();
//     return data;
//   } catch (error) {
//     console.error('Error fetching menu data:', error);
//     throw error;
//   }
// }

// export function isProductAvailable(product: MenuProduct): boolean {
// if (!product.in_stock && !product.automatic_in_stock) {
//   return false;
// }

// if (product.available_start && product.available_end) {
//   const now = new Date();
//   const currentTime = now.getHours() * 100 + now.getMinutes();

//   const [startHour, startMin] = product.available_start.split(':').map(Number);
//   const [endHour, endMin] = product.available_end.split(':').map(Number);

//   const startTime = startHour * 100 + startMin;
//   const endTime = endHour * 100 + endMin;

//   if (currentTime < startTime || currentTime > endTime) {
//     return false;
//   }
// }

//   return true;
// }


/* ------------------------------------------------------------------ payments */

/**
 * Online payment runs on a *reserved* order, not a placed one.
 *
 * `/order/unconfirmed` holds the basket server-side and returns an id; the
 * PaymentIntent is created against that id, and the order only becomes real
 * when Stripe's webhook says the money arrived. The browser is never what
 * confirms an order — a customer who closes the tab mid-payment must not end up
 * with a paid order nobody is cooking, nor a cooked order nobody paid for.
 */
export const createUnconfirmedOrder = async (adminId: string, storeId: string, apiKey: string, orderData: any) => {
  const res = await fetch(`${API_BASE_URL}/order/unconfirmed`, {
    method: 'POST',
    headers: apiHeaders({ apiKey, adminId, storeId }),
    body: JSON.stringify(orderData),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || 'Could not reserve the order');
  return json?.data ?? json;
};

/**
 * A PaymentIntent for a reserved order.
 *
 * Only the order id goes over the wire — the server reads the amount off the
 * order, so nothing here can change what is charged. Returns the connected
 * account too: charges are created on the restaurant's own Stripe account, and
 * Stripe.js has to be initialised against it.
 */
export const createPaymentIntent = async (orderId: string, userId?: string, method?: string) => {
  const res = await fetch(`${PAYMENTS_BASE_URL}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-api-key': PAYMENT_API_KEY,
    },
    body: JSON.stringify({ order_id: orderId, user_id: userId, payment_method_type: method }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || 'Could not start the payment');
  return json?.data as { client_secret: string; stripe_account_id: string; amount: number };
};
