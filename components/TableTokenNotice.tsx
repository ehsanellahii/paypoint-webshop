'use client';

import { useEffect, useState } from 'react';
import { QrCode, X } from 'lucide-react';

import { useIsMobile } from '~/contexts/device-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { cn } from '~/lib/utils';
import { SAFE_TOP } from '~/components/mobile/MobileShell';

const dismissedKey = (slug: string) => `pos-table-notice-dismissed:${slug || 'default'}`;

/**
 * "This table code is no longer valid" — shown when a `?t=` token was refused
 * and the shop loaded without the table (`tableTokenInvalid` on the store).
 *
 * The guest is no longer seated as dine-in, and without a word they would
 * simply see a delivery/pickup shop and not know why. A small card that floats
 * over the top of the menu, never over the cart or the order buttons, and that
 * the guest can put away; it stays away for the rest of the visit.
 */
export default function TableTokenNotice() {
  const storeInfo = useStore();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const slug = storeInfo?.slug || '';
  const flagged = !!storeInfo?.tableTokenInvalid;

  /*
   * Decided after mount: whether it was put away lives in session storage,
   * which the server cannot read, so rendering it straight away would make the
   * server's HTML and the first client render disagree.
   */
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!flagged) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(dismissedKey(slug)) === '1';
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after mount
    if (!dismissed) setVisible(true);
  }, [flagged, slug]);

  if (!flagged || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(dismissedKey(slug), '1');
    } catch {}
  };

  return (
    <div
      role='status'
      className={cn('pointer-events-none fixed inset-x-0 z-[71] flex justify-center', isMobile ? 'px-3' : 'px-6')}
      // Mobile: under the cover's menu and address buttons. Desktop: under the 74px header.
      style={{ top: isMobile ? `calc(${SAFE_TOP} + 52px)` : 86 }}>
      <div className='anim-fade pointer-events-auto flex w-full max-w-[520px] items-start gap-3 rounded-[18px] border border-border-strong bg-surface-1 p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15'>
          <QrCode className='h-5 w-5 text-warning' strokeWidth={1.9} />
        </span>
        <div className='min-w-0 flex-1 pt-0.5'>
          <div className='text-sm font-extrabold text-white'>{t.tableTokenInvalidTitle}</div>
          <div className='mt-0.5 text-[12.5px] font-medium leading-snug text-muted-foreground'>{t.tableTokenInvalidSub}</div>
        </div>
        {/* 44px hit area around the design's 32px circle. */}
        <button type='button' onClick={dismiss} aria-label={t.dismiss} className='-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full'>
          <span className='flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </span>
        </button>
      </div>
    </div>
  );
}
