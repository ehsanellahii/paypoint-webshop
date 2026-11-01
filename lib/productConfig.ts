import type { MenuProduct } from '~/lib/utils';

type ProductShape = Pick<MenuProduct, 'skus' | 'haveCustomizations' | 'addOns'>;

/**
 * Must the guest configure this product before it can go into the cart?
 *
 * Yes when there is a size to choose (more than one variant — the price
 * depends on it) or a customisation group with a minimum. One rule for every
 * quick-add button in the shop: menu cards on desktop and mobile, cart
 * recommendations, favourites and "order again". Each used to carry its own
 * copy, and the copies disagreed — the mobile "+" put a pizza in the cart with
 * no size at the base price.
 */
export function requiresConfiguration(p: ProductShape): boolean {
  if ((p.skus ?? []).length > 1) return true;
  return (p.addOns ?? []).some((g) => (g.minimumQuantity ?? 0) > 0);
}

/** Does the product offer anything to choose at all, required or not? */
export function hasOptions(p: ProductShape): boolean {
  return (p.skus ?? []).length > 1 || (p.addOns ?? []).some((g) => (g.options ?? []).length > 0);
}

/**
 * Sold out: the product has variants and none of them is available.
 * A product without variant data is treated as available — the server
 * refuses it at order time if it is not.
 */
export function isSoldOut(p: Pick<MenuProduct, 'skus'>): boolean {
  const skus = p.skus ?? [];
  return skus.length > 0 && skus.every((s) => s.available === false);
}
