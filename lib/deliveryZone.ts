import type { DeliveryZone } from './api';
import type { IStoreInfo } from './types';

/**
 * Delivery terms for the active address: whether the store delivers there,
 * the minimum order, the fee and the ETA.
 *
 * The server decides this (`GET /delivery-zone`). The zone gate and the
 * address dialog asked it, but the menu, the cart and the checkout recomputed
 * the answer from the rate table shipped with the page — comparing a Number
 * against a code stored as a string. So the gate said yes and the checkout
 * then refused with "Wir liefern nicht in dein Gebiet". Every screen now reads
 * the server's answer, kept with the address in the address context.
 *
 * The rule for a store with delivery switched on but no postcode zones
 * (server 0051, the owner's rule): it delivers nowhere. `/delivery-zone`
 * answers `isAvailable: false, hasZones: false` and the order route refuses
 * with `DELIVERY_AREA`; every stand-in here says the same, never "everywhere".
 */

/** The server's answer, with the postcode it was asked about and when. */
export type DeliveryZoneAnswer = DeliveryZone & {
  /** The postcode as sent — `postalCode` on the answer is the server's padded form. */
  requestedPostalCode: string;
  checkedAt: number;
};

/**
 * `none`: no address to ask about. `pending`: asking. `ok`: answered.
 * `error`: the server could not be reached, so the local table stands in.
 */
export type DeliveryZoneStatus = 'none' | 'pending' | 'ok' | 'error';

/** Same shape as `getPostalRateInfo`'s result, so the screens read it unchanged. */
export type DeliveryRate = {
  isAvailable: boolean;
  deliveryCharges: number | null;
  minimumOrderAmount: number | null;
  deliveryTime: number | null;
  priorityDeliveryCharges: number | null;
  priorityDeliveryTime: number | null;
  /** Where the figures came from. */
  source: 'server' | 'local' | 'none';
  /** The server has not answered for this address yet. */
  pending: boolean;
};

export const EMPTY_RATE: DeliveryRate = {
  isAvailable: false,
  deliveryCharges: null,
  minimumOrderAmount: null,
  deliveryTime: null,
  priorityDeliveryCharges: null,
  priorityDeliveryTime: null,
  source: 'none',
  pending: false,
};

/** A German postcode as five digits ("1067" and " 01067" are both "01067"). */
export function normalizePostalCode(value: unknown): string {
  const digits = String(value ?? '').replace(/\s+/g, '');
  return /^\d{1,5}$/.test(digits) ? digits.padStart(5, '0') : digits;
}

/**
 * Does this `/delivery-zone` answer say the store delivers there?
 *
 * `hasZones: false` is "no zones set up", which means nowhere — also when an
 * older server (before 0051) still answered it with `isAvailable: true`, or
 * an answer of that kind is still held in storage from an earlier visit.
 */
export function zoneDelivers(zone: Pick<DeliveryZone, 'isAvailable' | 'hasZones'> | null | undefined): boolean {
  return !!zone && !!zone.isAvailable && zone.hasZones !== false;
}

/** The server's answer applies to this postcode. */
export function zoneMatches(zone: DeliveryZoneAnswer | null | undefined, postalCode: string | null | undefined): zone is DeliveryZoneAnswer {
  if (!zone || !postalCode) return false;
  return normalizePostalCode(zone.requestedPostalCode) === normalizePostalCode(postalCode);
}

type PostalRates = IStoreInfo['postalRates'] | null | undefined;

/**
 * The rate table shipped with the page, read the way the server reads it —
 * only for when the server cannot be asked.
 *
 * A store with no zones delivers nowhere, as the server answers for it.
 */
export function localDeliveryRate(postalCode: string, postalRates: PostalRates): DeliveryRate {
  const rates = postalRates ?? [];
  if (rates.length === 0) return { ...EMPTY_RATE, source: 'local' };
  const wanted = normalizePostalCode(postalCode);
  const rate = rates.find((r) => normalizePostalCode(r.postalCode) === wanted);
  if (!rate) return { ...EMPTY_RATE, source: 'local' };
  return {
    isAvailable: true,
    deliveryCharges: rate.deliveryCharges ?? null,
    minimumOrderAmount: rate.minimumOrderAmount ?? null,
    deliveryTime: rate.deliveryTime ?? null,
    priorityDeliveryCharges: rate.priorityDeliveryCharges ?? null,
    priorityDeliveryTime: rate.priorityDeliveryTime ?? null,
    source: 'local',
    pending: false,
  };
}

/**
 * One answer for every screen: the server's for this address when there is
 * one, otherwise the local table — flagged `pending` while the server is
 * still being asked, so checkout can wait for it.
 */
export function resolveDeliveryRate({
  postalCode,
  isGerman = true,
  zone,
  status,
  postalRates,
}: {
  postalCode?: string | null;
  isGerman?: boolean;
  zone?: DeliveryZoneAnswer | null;
  status: DeliveryZoneStatus;
  postalRates?: PostalRates;
}): DeliveryRate {
  if (!postalCode) return EMPTY_RATE;
  // Outside Germany is outside every delivery area, zones or not.
  if (!isGerman) return { ...EMPTY_RATE, source: 'local' };

  if (zoneMatches(zone, postalCode)) {
    return {
      isAvailable: zoneDelivers(zone),
      deliveryCharges: zone.deliveryCharges ?? null,
      minimumOrderAmount: zone.minimumOrderAmount ?? null,
      deliveryTime: zone.deliveryTime ?? null,
      priorityDeliveryCharges: zone.priorityDeliveryCharges ?? null,
      priorityDeliveryTime: zone.priorityDeliveryTime ?? null,
      source: 'server',
      pending: false,
    };
  }

  const local = localDeliveryRate(postalCode, postalRates);
  if (status === 'error') return local;
  // Not answered yet: show the table's figures meanwhile, but say so. A
  // "not in your area" is never shown off the table while the server may
  // still say yes.
  return { ...local, isAvailable: true, pending: true };
}
