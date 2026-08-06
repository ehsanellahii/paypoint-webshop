import type { PreorderSlot } from '~/components/menu/PreorderModal';

/**
 * A pre-order slot chosen on the menu has to survive the navigation to the
 * checkout route, so it's persisted per store rather than held in React state.
 */
const key = (slug: string) => `pos-preorder:${slug || 'default'}`;

export function savePreorderSlot(slug: string, slot: PreorderSlot | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!slot) sessionStorage.removeItem(key(slug));
    else sessionStorage.setItem(key(slug), JSON.stringify(slot));
  } catch {
    /* non-critical */
  }
}

export function getPreorderSlot(slug: string): PreorderSlot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as PreorderSlot) : null;
  } catch {
    return null;
  }
}

export function clearPreorderSlot(slug: string) {
  savePreorderSlot(slug, null);
}
