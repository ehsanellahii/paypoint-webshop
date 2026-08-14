'use client';

import { buildRouteTiles, fitBounds, pointToPixel, type Coord } from '~/lib/staticMap';
import { cn } from '~/lib/utils';

/**
 * Store → customer map with our own pins drawn over it.
 *
 * The pins are markup, not map markers, because Static Maps only accepts a
 * raster icon from a public URL — an SVG cannot be handed to the API, and a
 * PNG on localhost is not reachable by Google either. So we ask Google for
 * tiles and the route line, work out the framing ourselves, and place the pins
 * on top.
 *
 * The container therefore has to keep the aspect ratio the image was requested
 * at: `background-size: cover` on a differently-shaped box would crop, and a
 * crop moves the pins off their points.
 */
type Props = {
  store: Coord;
  customer: Coord;
  apiKey: string;
  /** Requested image size — also fixes the aspect ratio of the box. */
  width: number;
  height: number;
  className?: string;
};

/** Pin anchored at its tip, so (x, y) is the point it marks. */
function Pin({ x, y, tone, children }: { x: number; y: number; tone: 'store' | 'home'; children: React.ReactNode }) {
  const isStore = tone === 'store';
  return (
    <span
      className='pointer-events-none absolute'
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}>
      <svg width='34' height='42' viewBox='0 0 34 42' fill='none' style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.55))' }}>
        <path
          d='M17 41c0 0 14-14.4 14-24A14 14 0 1 0 3 17c0 9.6 14 24 14 24z'
          fill={isStore ? 'var(--brand-red)' : '#ffffff'}
          stroke='rgba(0,0,0,.28)'
          strokeWidth='1'
        />
        <circle cx='17' cy='16.5' r='9' fill={isStore ? 'rgba(255,255,255,.94)' : '#141416'} />
        <g transform='translate(17 16.5)' stroke={isStore ? 'var(--brand-red)' : '#ffffff'} strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' fill='none'>
          {children}
        </g>
      </svg>
    </span>
  );
}

export default function RouteMap({ store, customer, apiKey, width, height, className }: Props) {
  const { center, zoom } = fitBounds(store, customer, width, height);
  const url = buildRouteTiles(store, customer, apiKey, center, zoom, width, height);
  if (!url) return null;

  const s = pointToPixel(store, center, zoom, width, height);
  const c = pointToPixel(customer, center, zoom, width, height);
  // Percentages, so the overlay follows the box however wide it renders.
  const pct = (p: { x: number; y: number }) => ({ x: (p.x / width) * 100, y: (p.y / height) * 100 });
  const sp = pct(s);
  const cp = pct(c);

  return (
    <div
      className={cn('relative w-full bg-card bg-cover bg-center', className)}
      style={{ aspectRatio: `${width} / ${height}`, backgroundImage: `url("${url}")` }}>
      {/* Store: a storefront awning. */}
      <Pin x={sp.x} y={sp.y} tone='store'>
        <path d='M-4.6 -1.2h9.2v5.4h-9.2z' />
        <path d='M-5.4 -1.2l1.1-3h8.6l1.1 3' />
      </Pin>
      {/* Customer: a house. */}
      <Pin x={cp.x} y={cp.y} tone='home'>
        <path d='M-4.8 0.4l4.8-4.2 4.8 4.2' />
        <path d='M-3.3 -0.3v4.6h6.6v-4.6' />
      </Pin>
    </div>
  );
}
