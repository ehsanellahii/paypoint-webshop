/** Dark-styled Google Static Map, matching the app's surface palette. */
const DARK_MAP_STYLE = [
  'feature:all|element:geometry|color:0x1c1c1e',
  'feature:all|element:labels.text.fill|color:0x8a8d93',
  'feature:all|element:labels.text.stroke|color:0x1c1c1e|weight:2',
  'feature:all|element:labels.icon|visibility:off',
  'feature:poi|element:geometry|color:0x242428',
  'feature:poi.business|visibility:off',
  'feature:road|element:geometry|color:0x2e2e34',
  'feature:road|element:labels|visibility:off',
  'feature:water|element:geometry|color:0x17232e',
];

export function buildStaticMap(lat: number, lng: number, key: string, width = 560, height = 260, zoom = 15) {
  if (!lat || !lng || !key) return '';
  let url = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=2&maptype=roadmap&center=${lat},${lng}&zoom=${zoom}`;
  DARK_MAP_STYLE.forEach((s) => (url += `&style=${encodeURIComponent(s)}`));
  url += `&markers=${encodeURIComponent(`size:mid|color:0xffffff|${lat},${lng}`)}`;
  url += `&key=${key}`;
  return url;
}

type Coord = { lat: number; lng: number };

/**
 * Delivery route map: a line from the store (red pin) to the customer (white
 * pin), auto-framed to fit both. Falls back to an empty string if either point
 * or the key is missing, so callers can degrade to a plain map/gradient.
 */
export function buildRouteMap(store: Coord | null, customer: Coord | null, key: string, width = 560, height = 260) {
  if (!store?.lat || !store?.lng || !customer?.lat || !customer?.lng || !key) return '';

  let url = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=2&maptype=roadmap`;
  DARK_MAP_STYLE.forEach((s) => (url += `&style=${encodeURIComponent(s)}`));

  url += `&markers=${encodeURIComponent(`size:mid|color:0xec5b4f|${store.lat},${store.lng}`)}`;
  url += `&markers=${encodeURIComponent(`size:mid|color:0xffffff|${customer.lat},${customer.lng}`)}`;
  // Straight-line path (a real routed polyline would need the Directions API).
  url += `&path=${encodeURIComponent(`color:0xffffffd0|weight:5|${store.lat},${store.lng}|${customer.lat},${customer.lng}`)}`;
  url += `&key=${key}`;
  return url;
}
