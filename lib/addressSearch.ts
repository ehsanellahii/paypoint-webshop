/**
 * Address search for delivery: German addresses only.
 *
 * Every PayPoint restaurant delivers in Germany, but Google's address
 * suggestions are worldwide by default — typing "Müllerstr" offered streets in
 * the US and elsewhere, which a guest could pick and then fail the delivery
 * check with. The country restriction removes them from the list altogether;
 * the bias around the restaurant only reorders what is left, so the nearby
 * street comes first and a German address further away is still offered.
 *
 * One place for the rule, used by every address lookup in the shop
 * (`ZoneCheckGate`, `DeliveryAddressModal`) and by the address book when it
 * loads what an earlier visit saved (`address-context`).
 */

/** ISO 3166-1 alpha-2, as Google expects it. */
export const ADDRESS_COUNTRY = 'de';

/** How far around the restaurant results are preferred (not limited). */
const BIAS_RADIUS_M = 30_000;

/** Metres per degree of latitude (and of longitude at the equator). */
const M_PER_DEG = 111_320;

type StoreCoordinates = { latitude: number; longitude: number } | null | undefined;

const isUsable = (c: StoreCoordinates): c is { latitude: number; longitude: number } =>
  !!c &&
  Number.isFinite(c.latitude) &&
  Number.isFinite(c.longitude) &&
  Math.abs(c.latitude) <= 90 &&
  Math.abs(c.longitude) <= 180 &&
  // 0/0 is what an unset location often comes back as — no bias then.
  !(c.latitude === 0 && c.longitude === 0);

/** Request for `AutocompleteService.getPlacePredictions`. */
export function addressPredictionRequest(
  input: string,
  storeCoordinates?: StoreCoordinates,
): google.maps.places.AutocompletionRequest {
  return {
    input,
    types: ['address'],
    componentRestrictions: { country: ADDRESS_COUNTRY },
    ...(isUsable(storeCoordinates)
      ? {
          locationBias: {
            center: { lat: storeCoordinates.latitude, lng: storeCoordinates.longitude },
            radius: BIAS_RADIUS_M,
          },
        }
      : {}),
  };
}

/**
 * Request for `Geocoder.geocode` with a typed address.
 *
 * `bounds` around the restaurant matters here: "Müllerstr 142" typed without a
 * city exists in many German towns, and without it Google may pick another
 * town's street — whose postcode is then "outside the delivery area". Like the
 * bias above, `bounds` only prefers; it never removes an address further away.
 */
export function addressGeocodeRequest(
  address: string,
  storeCoordinates?: StoreCoordinates,
): google.maps.GeocoderRequest {
  return {
    address,
    componentRestrictions: { country: ADDRESS_COUNTRY },
    region: ADDRESS_COUNTRY,
    ...(isUsable(storeCoordinates) ? { bounds: boundsAround(storeCoordinates, BIAS_RADIUS_M) } : {}),
  };
}

function boundsAround(
  c: { latitude: number; longitude: number },
  radiusM: number,
): google.maps.LatLngBoundsLiteral {
  const dLat = radiusM / M_PER_DEG;
  const dLng = radiusM / (M_PER_DEG * Math.max(Math.cos((c.latitude * Math.PI) / 180), 0.01));
  return {
    south: Math.max(c.latitude - dLat, -90),
    north: Math.min(c.latitude + dLat, 90),
    west: c.longitude - dLng,
    east: c.longitude + dLng,
  };
}

/** The two-letter country of a Google result ("DE") — the same in every language. */
export function countryCodeOf(components?: google.maps.GeocoderAddressComponent[] | null): string | undefined {
  return components?.find((c) => c.types.includes('country'))?.short_name || undefined;
}

/*
 * Addresses saved before `countryCode` existed only carry Google's long name,
 * which comes in the browser's language. These are the names for Germany in the
 * languages guests here use; an older German entry in any other language is
 * dropped and simply typed again, which is cheaper than keeping a foreign one.
 */
const GERMANY_NAMES = new Set([
  'deutschland',
  'germany',
  'almanya',
  'ألمانيا',
  'niemcy',
  'германия',
  'німеччина',
  'allemagne',
  'alemania',
  'germania',
  'alemanha',
  'duitsland',
  'tyskland',
  'německo',
  'nemecko',
  'németország',
  'njemačka',
  'nemačka',
  'немачка',
  'γερμανία',
  'גרמניה',
  'آلمان',
  'جرمنی',
  'saksa',
  'vokietija',
  'vācija',
  'saksamaa',
  'gjermania',
  'германија',
  'đức',
  '德国',
  '德國',
  'ドイツ',
  '독일',
]);

/**
 * Whether a resolved or stored address is in Germany.
 * An address with no country at all (typed by hand, very old entry) is kept:
 * there is nothing to tell from, and the delivery check still runs on it.
 */
export function isGermanAddress(a: { countryCode?: string; country?: string } | null | undefined): boolean {
  if (!a) return false;
  if (a.countryCode) return a.countryCode.toUpperCase() === ADDRESS_COUNTRY.toUpperCase();
  if (a.country) return GERMANY_NAMES.has(a.country.trim().toLowerCase());
  return true;
}
