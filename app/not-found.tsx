import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SearchX } from 'lucide-react';

import NotFoundMenuLink from '~/components/NotFoundMenuLink';
import { translations } from '~/lib/i18n';
import { CUSTOM_DOMAIN_HEADER } from '~/lib/requestHeaders';
import './globals.css';

/*
 * The 404 for an address that names no store (/gibtsnicht) and for any path
 * no route claims (/pizza-mandm/foo), always with a real 404 status. It sits
 * outside every store's layout — the store layout is the root layout — so
 * it is neutral and German, in the shop's own dark look. It used to be an
 * unstyled English sales page for PayPoint ("Welcome to PayPoint Online
 * Kiosk … Increase your revenue"), shown to restaurant guests who had
 * mistyped a link.
 *
 * No provider is above this page, so the German texts are read directly.
 */
const t = translations.de;

export const metadata: Metadata = {
  title: t.notFoundTitle,
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const onCustomDomain = !!(await headers()).get(CUSTOM_DOMAIN_HEADER);
  return (
    <main lang='de' className='flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 text-center'>
      <div className='flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card'>
        <SearchX className='h-9 w-9 text-muted-foreground' strokeWidth={1.6} />
      </div>
      <h1 className='mt-1 text-[19px] font-extrabold text-white'>{t.notFoundTitle}</h1>
      <p className='max-w-[340px] text-[13.5px] font-medium leading-relaxed text-muted-foreground'>{t.notFoundRootSub}</p>
      <NotFoundMenuLink onCustomDomain={onCustomDomain} label={t.backToMenu} />
    </main>
  );
}
