import type { CartItem, CartItemCustomization } from '~/contexts/cart-context';
import { isSoldOut } from '~/lib/productConfig';
import { cartLineUnitCents, type MenuProduct, type MenuSku } from '~/lib/utils';

/**
 * Cart lines checked against the menu as the server sees it now.
 *
 * A cart is kept in localStorage for days. In that time a price changes, a
 * size or an option is removed, a product sells out — and the cart kept
 * showing the old figure until the server refused or repriced the order at
 * checkout. Everything here is pure so the rules can be tested without React;
 * `cart-context` wraps it as `reconcile(products)`.
 */

/** Option map with only positive quantities, keys sorted — the same choice always serialises the same way. */
export function normalizeCustomizations(c: CartItemCustomization | undefined | null): CartItemCustomization {
  const out: CartItemCustomization = {};
  for (const groupId of Object.keys(c || {}).sort()) {
    const group = (c || {})[groupId] || {};
    const options: Record<string, number> = {};
    for (const optionId of Object.keys(group).sort()) {
      const qty = Math.floor(Number(group[optionId] ?? 0));
      if (qty > 0) options[optionId] = qty;
    }
    if (Object.keys(options).length > 0) out[groupId] = options;
  }
  return out;
}

/** A note, trimmed; empty means "no note". */
export const normalizeNote = (notes?: string | null): string | undefined => {
  const n = (notes ?? '').trim();
  return n ? n : undefined;
};

/**
 * The id of a cart line: product, size, options — and the note.
 *
 * The note used to be left out, so "Pizza, no onions" added after a plain
 * "Pizza" merged into the first line and the note was lost.
 */
export function cartLineId(productId: string, skuId: string | null | undefined, customizations: CartItemCustomization, notes?: string | null): string {
  const note = normalizeNote(notes);
  const base = `${productId}-${skuId ?? 'base'}-${JSON.stringify(normalizeCustomizations(customizations))}`;
  return note ? `${base}-n:${note}` : base;
}

/** The product as it is held on a line: the size's price and name folded in. */
export function lineProduct(product: MenuProduct, sku?: MenuSku | null): MenuProduct {
  if (!sku) return product;
  return {
    ...product,
    currentPrice: sku.price,
    name: sku.name ? `${product.name} (${sku.name})` : product.name,
    skuRef: sku._id,
    skuName: sku.name,
  };
}

/**
 * The size a line should be sold in, or null when the line cannot be sold.
 *
 * - a named size must still exist and be available;
 * - no size named and the product has several: the customer never chose one
 *   (the old quick-add bug) — the server refuses it, so the line is dropped;
 * - exactly one size: that one. Lines added before sizes existed adopt it.
 */
export function resolveSku(product: MenuProduct, skuId?: string | null, skuName?: string | null): MenuSku | null | undefined {
  const skus = product.skus ?? [];
  let sku: MenuSku | undefined;
  if (skuId) {
    sku = skus.find((s) => String(s._id) === String(skuId));
    if (!sku && skuName) sku = skus.find((s) => (s.name ?? '') === skuName);
    // A product with a single size has nothing to choose — its size is the product.
    if (!sku && skus.length === 1 && !skus[0].name) sku = skus[0];
    if (!sku) return null;
  } else if (skus.length > 1) {
    if (skuName) sku = skus.find((s) => (s.name ?? '') === skuName);
    if (!sku) return null;
  } else if (skus.length === 1) {
    sku = skus[0];
  }
  if (sku && sku.available === false) return null;
  return sku; // undefined: a product without size data, sold at its own price
}

/**
 * Options that still exist and still obey the product's rules, or null.
 * Mirrors what the order route checks, so a line that passes here is not
 * refused at checkout for its options.
 */
export function validateCustomizations(product: MenuProduct, customizations: CartItemCustomization | undefined | null): CartItemCustomization | null {
  const clean = normalizeCustomizations(customizations);
  const groups = product.addOns ?? [];

  for (const [groupId, options] of Object.entries(clean)) {
    const group = groups.find((g) => g._id === groupId);
    if (!group) return null;
    for (const optionId of Object.keys(options)) {
      if (!(group.options ?? []).some((o) => o._id === optionId)) return null;
    }
  }

  for (const group of groups) {
    const chosen = clean[group._id] ?? {};
    const total = Object.values(chosen).reduce((a, b) => a + b, 0);
    const distinct = Object.keys(chosen).length;
    const min = Number(group.minimumQuantity ?? 0);
    if (min > 0 && total < min) return null;
    if (distinct === 0) continue;
    // The server reads a missing maximum as 1.
    const max = Number(group.maximumQuantity ?? 1);
    if (max > 0 && total > max) return null;
    if (!group.isMultipleSelectionAllowed && distinct > 1) return null;
    if (group.isMultipleSelectionAllowed && group.maxMultipleSelection && distinct > Number(group.maxMultipleSelection)) return null;
  }
  return clean;
}

/** A line built fresh from the menu, or null when it can no longer be sold as chosen. */
export function buildCartLine(
  product: MenuProduct,
  quantity: number,
  customizations: CartItemCustomization | undefined | null,
  notes?: string | null,
  skuId?: string | null,
  skuName?: string | null,
): CartItem | null {
  if (!product || isSoldOut(product)) return null;
  const qty = Math.floor(Number(quantity) || 0);
  if (qty <= 0) return null;
  const sku = resolveSku(product, skuId, skuName);
  if (sku === null) return null;
  const clean = validateCustomizations(product, customizations);
  if (!clean) return null;
  const productId = String(product.id ?? product._id);
  const note = normalizeNote(notes);
  return {
    id: cartLineId(productId, sku?._id, clean, note),
    product: lineProduct(product, sku),
    quantity: qty,
    customizations: clean,
    notes: note,
  };
}

export type ReconcileResult = {
  cart: CartItem[];
  /** Lines dropped: product, size or option gone, sold out, or rules no longer met. */
  removed: number;
  /** Lines kept but changed: new price, adopted size, merged duplicates. */
  updated: number;
};

/** Index a menu by both of its id fields. */
function indexProducts(products: MenuProduct[]): Map<string, MenuProduct> {
  const map = new Map<string, MenuProduct>();
  for (const p of products ?? []) {
    if (!p) continue;
    if (p.id != null) map.set(String(p.id), p);
    if (p._id != null) map.set(String(p._id), p);
  }
  return map;
}

/**
 * Bring every cart line in line with the menu that was just loaded.
 *
 * Prices (product, size and option) are taken from the menu; a line whose
 * product, size or option is gone, or which is sold out, is dropped. Returns
 * the same array when nothing changed, so a caller can skip the state update.
 */
export function reconcileCartLines(cart: CartItem[], products: MenuProduct[]): ReconcileResult {
  const index = indexProducts(products);
  const next: CartItem[] = [];
  let removed = 0;
  let updated = 0;

  for (const line of cart ?? []) {
    const fresh = index.get(String(line?.product?.id ?? line?.product?._id ?? ''));
    const rebuilt = fresh ? buildCartLine(fresh, line.quantity, line.customizations, line.notes, line.product?.skuRef, line.product?.skuName) : null;
    if (!rebuilt) {
      removed += 1;
      continue;
    }
    const changed =
      rebuilt.id !== line.id ||
      rebuilt.product.name !== line.product.name ||
      cartLineUnitCents(rebuilt) !== cartLineUnitCents(line) ||
      JSON.stringify(rebuilt.customizations) !== JSON.stringify(normalizeCustomizations(line.customizations));

    const twin = next.findIndex((l) => l.id === rebuilt.id);
    if (twin >= 0) {
      next[twin] = { ...next[twin], quantity: next[twin].quantity + rebuilt.quantity };
      updated += 1;
      continue;
    }
    if (changed) {
      updated += 1;
      next.push(rebuilt);
    } else {
      // Keep the stored product object when nothing moved, but take the menu's
      // copy of everything else (images, description) — it is the newer one.
      next.push({ ...line, product: rebuilt.product });
    }
  }

  if (removed === 0 && updated === 0) return { cart, removed, updated };
  return { cart: next, removed, updated };
}

/** A line of a past order, as `/orders/:customerId` returns it. */
export type OrderLineLike = {
  id?: string;
  uid?: string;
  quantity?: number;
  skuId?: string;
  skuRef?: string;
  skuName?: string | null;
  note?: string;
  customerNotes?: string;
  addOns?: { id?: string; uid?: string; quantity?: number; parentGroupId?: string }[];
};

export type ReorderLine = { product: MenuProduct; sku?: MenuSku; quantity: number; customizations: CartItemCustomization; notes?: string };

/**
 * "Order again", checked against today's menu.
 *
 * The history line knows the product, its size and its options; each is looked
 * up in the current menu, so the cart gets today's prices and nothing that is
 * no longer sold. Reorder used to copy the old name and price and drop size
 * and extras — a pizza came back as a sizeless line at last month's price.
 */
export function reorderLines(items: OrderLineLike[], products: MenuProduct[]): { lines: ReorderLine[]; skipped: number } {
  const index = indexProducts(products);
  const lines: ReorderLine[] = [];
  let skipped = 0;

  for (const it of items ?? []) {
    const product = index.get(String(it?.id ?? it?.uid ?? ''));
    if (!product) {
      skipped += 1;
      continue;
    }
    // Rebuild the option map; an add-on without its group id is matched by option id.
    const customizations: CartItemCustomization = {};
    let unknownOption = false;
    for (const a of it.addOns ?? []) {
      const optionId = String(a?.id ?? a?.uid ?? '');
      const qty = Math.floor(Number(a?.quantity ?? 1));
      if (!optionId || qty <= 0) continue;
      const groupId = a.parentGroupId ?? (product.addOns ?? []).find((g) => (g.options ?? []).some((o) => o._id === optionId))?._id;
      if (!groupId) {
        unknownOption = true;
        break;
      }
      customizations[groupId] = { ...(customizations[groupId] ?? {}), [optionId]: (customizations[groupId]?.[optionId] ?? 0) + qty };
    }
    if (unknownOption) {
      skipped += 1;
      continue;
    }
    const notes = it.note ?? it.customerNotes;
    // The stored skuRef can be a HubRise ref, so the size is matched by id first.
    const built = buildCartLine(product, it.quantity ?? 1, customizations, notes, it.skuId ?? it.skuRef, it.skuName);
    if (!built) {
      skipped += 1;
      continue;
    }
    const sku = built.product.skuRef ? (product.skus ?? []).find((s) => s._id === built.product.skuRef) : undefined;
    lines.push({ product, sku, quantity: built.quantity, customizations: built.customizations, notes: built.notes });
  }
  return { lines, skipped };
}
