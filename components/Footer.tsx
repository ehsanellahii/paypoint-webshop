'use client';

import Image from 'next/image';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';

export default function Footer() {
  const storeInfo = useStore();
  const { t } = useLanguage();
  return (
    <footer className='mx-auto shell mb-6 mt-4 rounded-2xl border border-border bg-surface-1 p-6 text-sm'>
      <div className='mx-auto'>
        {/* Top Section */}
        <div className='mb-4 flex flex-col items-center justify-between border-b border-border pb-4 md:flex-row md:items-start'>
          {/* Business Name - Left */}
          <div className='mb-2 font-bold text-foreground md:mb-0'>{storeInfo?.brandName}</div>

          {/* Contact Information - Right */}
          <div className='text-center text-muted-foreground md:text-right'>Email: {storeInfo?.email}</div>
        </div>

        {/* Bottom Section */}
        <div className='flex flex-col items-center justify-between md:flex-row md:items-start'>
          {/* Logo + Brand - Left */}
          <div className='mb-2 flex items-center gap-2 md:mb-0'>
            <a
              href='https://get-paypoint.de'
              target='_blank'
              rel='noopener noreferrer'
              className='relative inline-flex h-20 size-44 items-center justify-center rounded-full'>
              <Image src='/logo.png' alt={'PayPoint POS UG'} className='object-cover' aria-label='PayPoint POS UG' fill />
            </a>
          </div>

          {/* Legal Links + Copyright - Right */}
          <div className='text-center text-muted-foreground md:text-right'>
            <a href='https://byonesix.com/t-c-privacy-statement' className='mr-4 transition hover:text-white hover:underline'>
              {t.termAndConditions}
            </a>
            <a href='https://byonesix.com/t-c-privacy-statement' className='mr-4 transition hover:text-white hover:underline'>
              {t.privacyPolicy}
            </a>
            <span>© PayPoint POS UG</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
