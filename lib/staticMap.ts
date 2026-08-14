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

export type Coord = { lat: number; lng: number };

/*
 * Web Mercator, at zoom 0, in a 256px world. Enough to work out how Google
 * will frame a static map and therefore where on the finished image a given
 * point lands — which is what lets us draw our own pins over it.
 *
 * Static Maps only accepts raster icons from a public URL, so an SVG marker
 * cannot be passed to the API at all. Overlaying is the only way to get one,
 * and it keeps the pins crisp and themeable instead of shipping PNGs.
 */
const TILE = 256;

function project({ lat, lng }: Coord) {
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: TILE * (0.5 + lng / 360),
    y: TILE * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)),
  };
}

function unproject(x: number, y: number): Coord {
  return {
    lng: (x / TILE - 0.5) * 360,
    lat: (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / TILE))),
  };
}

/**
 * Centre and zoom that fit both points inside `width`×`height`, keeping
 * `padding` px clear on every side so a pin never touches the edge.
 *
 * We work this out rather than letting Google auto-frame, because a pin drawn
 * over the image has to know exactly which viewport the image ended up with.
 */
export function fitBounds(a: Coord, b: Coord, width: number, height: number, padX = 40, padY = 34, maxZoom = 16) {
  const pa = project(a);
  const pb = project(b);
  const spanX = Math.max(Math.abs(pa.x - pb.x), 1e-6);
  const spanY = Math.max(Math.abs(pa.y - pb.y), 1e-6);
  // Padding leaves room for a pin, which is drawn above the point it marks.
  const usableW = Math.max(width - padX * 2, 1);
  const usableH = Math.max(height - padY * 2, 1);
  const zoom = Math.max(1, Math.min(maxZoom, Math.floor(Math.min(Math.log2(usableW / spanX), Math.log2(usableH / spanY)))));
  return { center: unproject((pa.x + pb.x) / 2, (pa.y + pb.y) / 2), zoom };
}

/** Where `point` lands, in px, on a map of `width`×`height` at this centre and zoom. */
export function pointToPixel(point: Coord, center: Coord, zoom: number, width: number, height: number) {
  const scale = 2 ** zoom;
  const pp = project(point);
  const pc = project(center);
  return {
    x: (pp.x - pc.x) * scale + width / 2,
    y: (pp.y - pc.y) * scale + height / 2,
  };
}

/**
 * Tiles and the route line only — no markers. The caller draws those itself.
 */
export function buildRouteTiles(store: Coord, customer: Coord, key: string, center: Coord, zoom: number, width: number, height: number) {
  if (!key) return '';
  let url = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=2&maptype=roadmap&center=${center.lat},${center.lng}&zoom=${zoom}`;
  DARK_MAP_STYLE.forEach((s) => (url += `&style=${encodeURIComponent(s)}`));
  url += `&path=${encodeURIComponent(`color:0xffffffcc|weight:4|${store.lat},${store.lng}|${customer.lat},${customer.lng}`)}`;
  url += `&key=${key}`;
  return url;
}

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
