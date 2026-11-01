'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * "Zur Speisekarte" on the root 404 page, when the shop can be told from the
 * address.
 *
 * The root 404 renders outside every store's layout — Next answers an unknown
 * path under a store (/pizza-mandm/foo) with it, and with a real 404 status —
 * so it does not know the store. On a restaurant's own domain the menu is
 * simply "/" (the server says so through `onCustomDomain`); on ours it is the
 * first path segment, but only when there is more after it: a single unknown
 * segment is an unknown store, and linking to it would only loop.
 */
export default function NotFoundMenuLink({ onCustomDomain, label }: { onCustomDomain: boolean; label: string }) {
  const [href, setHref] = useState<string | null>(onCustomDomain ? '/' : null);
  useEffect(() => {
    if (onCustomDomain) return;
    const segments = window.location.pathname.split('/').filter(Boolean);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser
    if (segments.length >= 2 && /^[a-z0-9][a-z0-9-_]*$/i.test(segments[0])) setHref(`/${segments[0]}`);
  }, [onCustomDomain]);
  if (!href) return null;
  return (
    <a href={href} className='mt-2 inline-flex h-12 items-center gap-2 rounded-[14px] border border-border-strong px-5 text-sm font-extrabold text-white transition hover:bg-surface-hover active:scale-[0.97]'>
      <ArrowLeft className='h-4 w-4' strokeWidth={2.4} />
      {label}
    </a>
  );
}
