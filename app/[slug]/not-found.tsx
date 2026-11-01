'use client';

import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

import { useLanguage } from '~/contexts/language-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

/**
 * Something inside a store that does not exist — an old product link, an
 * account section that is not there. Rendered inside the store's layout, so
 * it can speak the guest's language and lead straight back to that store's
 * menu. It used to say "Invalid QR code … scan again" in English, whatever
 * had gone missing.
 *
 * Centred and fluid, so it works in both the desktop shell and the mobile
 * frame without branching on device. An address that names no store, or a
 * path no route claims, gets the root page (app/not-found.tsx) with a real
 * 404 status instead — see the store check in app/[slug]/layout.tsx.
 */
export default function NotFound() {
  const { t } = useLanguage();
  const { base, withToken } = useStoreNavigation();
  return (
    <div className='flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center'>
      <div className='flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card'>
        <SearchX className='h-9 w-9 text-muted-foreground' strokeWidth={1.6} />
      </div>
      <h1 className='mt-1 text-[19px] font-extrabold text-white'>{t.notFoundTitle}</h1>
      <p className='max-w-[320px] text-[13.5px] font-medium leading-relaxed text-muted-foreground'>{t.notFoundStoreSub}</p>
      <Link
        href={withToken(base || '/')}
        // Outlined, not in the store's colour: this page has no store data, so --primary would be the platform default.
        className='mt-2 inline-flex h-12 items-center gap-2 rounded-[14px] border border-border-strong px-5 text-sm font-extrabold text-white transition hover:bg-surface-hover active:scale-[0.97]'>
        <ArrowLeft className='h-4 w-4' strokeWidth={2.4} />
        {t.backToMenu}
      </Link>
    </div>
  );
}
