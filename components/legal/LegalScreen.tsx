'use client';

// The imprint and privacy texts shown here must be checked by a lawyer before go-live (see lib/legalTexts.ts).

import Link from 'next/link';
import { ArrowLeft, ChevronLeft } from 'lucide-react';

import Footer from '~/components/Footer';
import BrandMark from '~/components/menu/BrandMark';
import MobileShell, { MobileScreen } from '~/components/mobile/MobileShell';
import { useIsMobile } from '~/contexts/device-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { controllerLines, imprintData, type ImprintData } from '~/lib/legalInfo';
import { privacySections } from '~/lib/legalTexts';

export type LegalKind = 'impressum' | 'datenschutz';

/**
 * The restaurant's own imprint or privacy policy, inside the store's shell.
 *
 * Per store, because the restaurant is the provider and the controller — the
 * links used to point at PayPoint's own B2B terms and privacy page, which say
 * nothing about the restaurant a guest is ordering from.
 */
export default function LegalScreen({ kind }: { kind: LegalKind }) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const title = kind === 'impressum' ? t.imprint : t.privacyPolicyTitle;
  const body = kind === 'impressum' ? <ImprintBody /> : <PrivacyBody />;
  return isMobile ? <MobileLegal title={title}>{body}</MobileLegal> : <DesktopLegal title={title}>{body}</DesktopLegal>;
}

function DesktopLegal({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  const { toMenu, withToken, base } = useStoreNavigation();
  return (
    <div className='min-h-[100dvh] bg-background'>
      {/* The checkout's slim header: brand mark back to the menu, no menu controls. */}
      <header className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
        <div className='shell shell-pad flex h-[74px] items-center gap-4'>
          <BrandMark onClick={toMenu} />
          <div className='flex-1' />
          <Link
            href={withToken(base || '/')}
            className='inline-flex h-11 items-center gap-2 rounded-[13px] border border-border bg-surface-1 px-4 text-sm font-bold text-white transition hover:border-border-strong hover:bg-elevated'>
            <ArrowLeft className='h-4 w-4' strokeWidth={2.2} />
            {t.backToMenu}
          </Link>
        </div>
      </header>
      <main className='shell shell-pad py-10'>
        <article className='mx-auto max-w-[760px] rounded-3xl border border-border bg-card p-10'>
          <h1 className='m-0 text-[34px] font-extrabold leading-[1.05] tracking-tight text-white'>{title}</h1>
          <div className='mt-6'>{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function MobileLegal({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  const { toMenu } = useStoreNavigation();
  return (
    <MobileShell className='flex flex-col'>
      {/* Same header as the account screens; back always leads to the menu, also for a guest who arrived here directly. */}
      <div className='relative mt-3 flex h-[54px] flex-none items-center justify-center px-[18px]'>
        {/* 44px hit area around the account screens' 40px circle, which stays where it is. */}
        <button onClick={toMenu} aria-label={t.backToMenu} className='group absolute left-4 flex h-11 w-11 items-center justify-center'>
          <span className='flex h-10 w-10 items-center justify-center rounded-full bg-card text-white transition group-active:scale-90'>
            <ChevronLeft className='h-5 w-5' strokeWidth={2.2} />
          </span>
        </button>
        <h1 className='text-[17px] font-extrabold text-white'>{title}</h1>
      </div>
      <MobileScreen className='!relative !inset-auto min-h-0 flex-1 px-[18px] pb-10 pt-2'>{children}</MobileScreen>
    </MobileShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className='mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground'>{children}</div>;
}

function ImprintBody() {
  const { t } = useLanguage();
  const data: ImprintData = imprintData(useStore());
  const value = 'text-[15px] font-semibold leading-relaxed text-white';
  const link = 'text-white underline decoration-white/30 underline-offset-2 transition hover:decoration-white';
  return (
    <div className='flex flex-col gap-6'>
      <p className='m-0 text-[13.5px] font-medium text-muted-foreground'>{t.legalImprintIntro}</p>
      <div className={value}>
        {data.company && <div className='font-extrabold'>{data.company}</div>}
        {data.address && <div>{data.address}</div>}
      </div>
      {data.representedBy && (
        <div>
          <Label>{t.legalRepresentedBy}</Label>
          <div className={value}>{data.representedBy}</div>
        </div>
      )}
      {(data.phone || data.email) && (
        <div>
          <Label>{t.legalContact}</Label>
          <div className={value}>
            {data.phone && (
              <div>
                {t.legalPhone}:{' '}
                <a href={`tel:${data.phone.replace(/[^\d+]/g, '')}`} className={link}>
                  {data.phone}
                </a>
              </div>
            )}
            {data.email && (
              <div className='break-words'>
                {t.email}:{' '}
                <a href={`mailto:${data.email}`} className={link}>
                  {data.email}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
      {data.register && (
        <div>
          <Label>{t.legalRegister}</Label>
          <div className={value}>{data.register}</div>
        </div>
      )}
      {data.vatId && (
        <div>
          <Label>{t.legalVatId}</Label>
          <div className={value}>
            {t.legalVatIdSub}: {data.vatId}
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacyBody() {
  const { t, language } = useLanguage();
  const store = useStore();
  const data = imprintData(store);
  const sections = privacySections(language, {
    controller: controllerLines(data, { phone: t.legalPhone, email: t.email }),
    email: data.email,
    onlinePayment: !!store?.stripeChargesEnabled,
  });
  const text = 'm-0 whitespace-pre-line text-[14.5px] font-medium leading-relaxed text-fg-secondary';
  return (
    <div className='flex flex-col gap-7'>
      {sections.map((s) => (
        <section key={s.heading}>
          <h2 className='m-0 mb-2.5 text-[17px] font-extrabold text-white'>{s.heading}</h2>
          <div className='flex flex-col gap-2.5'>
            {s.paragraphs.map((p, i) => (
              <div key={i} className='contents'>
                <p className={text}>{p}</p>
                {i === 0 && s.address && (
                  <div className='rounded-2xl bg-surface-1 px-4 py-3.5 text-[14.5px] font-semibold leading-relaxed text-white'>
                    {s.address.map((line) => (
                      <div key={line} className='break-words'>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
                {i === 0 && s.list && (
                  <ul className='m-0 flex list-disc flex-col gap-1 pl-5 text-[14.5px] font-medium leading-relaxed text-fg-secondary'>
                    {s.list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
