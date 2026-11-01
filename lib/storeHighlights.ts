import type { Translations } from './i18n';
import type { IStoreInfo } from './types';
import { formatEtaRange } from './utils';

export type StoreHighlight = { kind: 'time' | 'orderTypes' | 'cuisine'; text: string };

type HighlightStore = Partial<Pick<IStoreInfo, 'deliveryTime' | 'cuisineTags' | 'settings'>> | null | undefined;

/**
 * The lines under the hero headline of the delivery gate and the sign-in card.
 *
 * Only what this store's own data says. The template shipped the same three
 * promises for every restaurant — "Echte italienische Küche", "In 20–40 Min.
 * bei dir", "Frische Zutaten, täglich" and a made-up "4,8 ★ · 820+
 * Bewertungen" — which were simply untrue for most of them. A line whose data
 * is missing is left out, so a store with nothing set shows none.
 */
export function storeHighlights(store: HighlightStore, t: Pick<Translations, 'highlightDeliveryTime' | 'deliveryAndPickup' | 'delivery' | 'pickup'>): StoreHighlight[] {
  const delivery = !!store?.settings?.orderTypes?.delivery;
  const pickup = store?.settings?.orderTypes?.takeaway !== false;
  const out: StoreHighlight[] = [];

  const eta = delivery ? formatEtaRange(store?.deliveryTime) : '';
  if (eta) out.push({ kind: 'time', text: t.highlightDeliveryTime.replace('{eta}', eta) });

  const types = delivery && pickup ? t.deliveryAndPickup : delivery ? t.delivery : pickup ? t.pickup : '';
  if (types) out.push({ kind: 'orderTypes', text: types });

  const cuisine = (store?.cuisineTags ?? []).map((c) => String(c).trim()).filter(Boolean).join(' · ');
  if (cuisine) out.push({ kind: 'cuisine', text: cuisine });

  return out;
}

/**
 * "Lieferzeit ca. 20–30 Min · ab 18,00 €" under a positive zone check: the
 * zone's own time from the server's answer, else the store-wide one, else no
 * time at all — never a fixed "20–40" that is true for nobody in particular.
 */
export function zoneResultLine(
  zoneDeliveryTime: number | null | undefined,
  storeDeliveryTime: number | null | undefined,
  minLabel: string,
  t: Pick<Translations, 'deliveryTimeApprox'>,
): string {
  const eta = formatEtaRange(zoneDeliveryTime ?? storeDeliveryTime);
  return [eta ? t.deliveryTimeApprox.replace('{eta}', eta) : '', minLabel].filter(Boolean).join(' · ');
}
