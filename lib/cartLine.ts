import type { CartItem } from '~/contexts/cart-context';

/**
 * The chosen options on a cart line, as one line of text.
 *
 * Every list that shows a cart line — the cart, the checkout summary, the
 * mobile cart — renders the same string, so it lives here rather than being
 * re-derived in each of them.
 */
export function cartLineExtras(item: CartItem): string {
  const parts: string[] = [];
  Object.entries(item.customizations || {}).forEach(([sectionId, group]) => {
    const section = item.product.addOns?.find((s) => s._id === sectionId);
    if (!section) return;
    Object.entries(group || {}).forEach(([optionId, qty]) => {
      if (qty <= 0) return;
      const option = section.options?.find((o) => o._id === optionId);
      if (option) parts.push(qty > 1 ? `${option.name} × ${qty}` : option.name);
    });
  });
  return parts.join(' · ');
}

/**
 * The same, but falling back to the product's own description when nothing was
 * customised — which is what the cart rows show.
 */
export function cartLineSubtitle(item: CartItem): string {
  return cartLineExtras(item) || item.product.description || '';
}
