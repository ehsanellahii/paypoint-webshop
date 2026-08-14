'use client';

import { useState } from 'react';
import { Check, ChevronRight, FileText, Globe, Heart, Info, LogOut, Mail, MessageSquare, Phone, Shield, ShoppingBag, ShoppingCart, Ticket, X } from 'lucide-react';

import MobileSheet, { SheetDivider, SheetGroup } from '~/components/mobile/MobileSheet';
import AuthenticationDialog from '~/components/dialogs/Authentication/AuthenticationDialog';
import { SAFE_TOP } from '~/components/mobile/MobileShell';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { cn } from '~/lib/utils';

const LANGUAGES: { code: 'de' | 'en'; name: string; sub: string; flag: string }[] = [
  { code: 'de', name: 'Deutsch', sub: 'German', flag: '🇩🇪' },
  { code: 'en', name: 'English', sub: 'Englisch', flag: '🇬🇧' },
];

/** One of the design's two big entry cards at the top of the drawer. */
function QuickCard({ icon: Icon, label, onClick, live }: { icon: typeof Heart; label: React.ReactNode; onClick: () => void; live?: boolean }) {
  return (
    <button
      onClick={onClick}
      className='relative flex flex-1 flex-col items-center gap-4 rounded-[20px] border border-white/[0.08] bg-surface-1 px-2.5 pb-5 pt-[26px] shadow-[0_14px_28px_-16px_rgba(0,0,0,0.9)] transition active:scale-[0.96]'>
      {live && (
        <span className='absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-red py-[3px] pl-1.5 pr-[7px]'>
          <span className='h-[5px] w-[5px] rounded-full bg-white' />
          <span className='text-[8.5px] font-extrabold tracking-[0.06em] text-white'>LIVE</span>
        </span>
      )}
      <span className='flex h-[54px] w-[54px] items-center justify-center rounded-2xl bg-primary/[0.13]'>
        <Icon className='h-[26px] w-[26px] text-primary' strokeWidth={1.8} />
      </span>
      <span className='text-center text-[13.5px] font-bold leading-[1.25] text-white'>{label}</span>
    </button>
  );
}

/** A tappable row inside a `SheetGroup`. */
function Row({ icon: Icon, label, value, onClick, danger }: { icon: typeof Heart; label: string; value?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className='flex w-full items-center gap-3.5 px-4 py-[15px] text-left transition active:bg-white/[0.04]'>
      <Icon className={cn('h-[21px] w-[21px] shrink-0', danger ? 'text-brand-red' : 'text-white')} strokeWidth={1.8} />
      <span className={cn('min-w-0 flex-1 text-[15px] font-semibold', danger ? 'text-brand-red' : 'text-white')}>{label}</span>
      {value && <span className='shrink-0 text-[13px] font-bold text-white'>{value}</span>}
      {!danger && <ChevronRight className='h-[18px] w-[18px] shrink-0 text-muted-foreground' strokeWidth={2} />}
    </button>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-2.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground', className)}>{children}</div>;
}

/**
 * The account menu as a full screen (mobile).
 *
 * The desktop drawer swaps its own body between favourites, orders and so on.
 * On a phone those are routes of their own — `/account/[section]` — so this is
 * purely navigation, and the sub-panels are never mounted twice.
 *
 * Support, language and the logout confirmation are bottom sheets over the top
 * of it, as the design has them, rather than further in-place views.
 */
export default function MobileAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, language, setLanguage } = useLanguage();
  const { user, clearUser } = useUser();
  const storeInfo = useStore();
  const { toAccount, toCart } = useStoreNavigation();

  const [sheet, setSheet] = useState<'none' | 'support' | 'lang' | 'logout'>('none');
  const [loginOpen, setLoginOpen] = useState(false);

  if (!open) return null;

  const isLoggedIn = !!user && !user?.isGuest;
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : null) || (t.guest ?? 'Guest');

  const go = (section: 'favorites' | 'orders' | 'vouchers') => {
    onClose();
    toAccount(section);
  };

  return (
    <div className='noscroll fixed inset-0 z-[70] flex justify-center overflow-y-auto bg-background'>
      <div className='w-full max-w-[440px]'>
        {/* Header */}
        <div className='relative flex-none' style={{ paddingTop: SAFE_TOP }}>
          <button
            onClick={onClose}
            aria-label={t.close}
            className='absolute right-[18px] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition active:scale-90'
            style={{ top: SAFE_TOP }}>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </button>
          <div className='px-[22px] pb-2.5 pt-[46px]'>
            <div className='text-[13px] font-bold uppercase tracking-[0.05em] text-muted-foreground'>{isLoggedIn ? (t.welcomeBack ?? 'Welcome back') : (t.orderingAsGuest ?? 'You’re ordering as a guest')}</div>
            <div className='mt-1.5 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white'>{displayName}</div>
          </div>
        </div>

        {/* Quick cards */}
        <div className='mt-3 flex gap-2.5 px-[18px]'>
          <QuickCard
            icon={Heart}
            label={
              <>
                {t.my ?? 'My'}
                <br />
                {t.favoriteProducts ?? 'Favorites'}
              </>
            }
            onClick={() => go('favorites')}
          />
          <QuickCard
            icon={ShoppingBag}
            label={
              <>
                {t.my ?? 'My'}
                <br />
                {t.orders ?? 'Orders'}
              </>
            }
            onClick={() => go('orders')}
          />
        </div>

        <div className='px-[18px] pb-[30px] pt-6'>
          {!isLoggedIn && (
            <button onClick={() => setLoginOpen(true)} className='mb-6 h-[52px] w-full rounded-[15px] bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.login ?? 'Sign in'}
            </button>
          )}

          <SectionLabel>{t.quickAccess ?? 'Quick access'}</SectionLabel>
          <SheetGroup>
            <Row
              icon={ShoppingCart}
              label={t.myCart ?? 'My cart'}
              onClick={() => {
                onClose();
                toCart();
              }}
            />
            <SheetDivider />
            <Row icon={Ticket} label={t.vouchers ?? 'Vouchers'} onClick={() => go('vouchers')} />
          </SheetGroup>

          <SectionLabel className='mt-6'>{t.help ?? 'Help'}</SectionLabel>
          <SheetGroup>
            <Row icon={MessageSquare} label={t.contactSupport ?? 'Contact support'} onClick={() => setSheet('support')} />
            <SheetDivider />
            <Row icon={Globe} label={t.changeLanguage ?? 'Change language'} value={language.toUpperCase()} onClick={() => setSheet('lang')} />
          </SheetGroup>

          <SectionLabel className='mt-6'>{t.legal ?? 'Legal'}</SectionLabel>
          <SheetGroup>
            <Row icon={Shield} label={t.privacy ?? 'Privacy'} onClick={onClose} />
            <SheetDivider />
            <Row icon={FileText} label={t.terms ?? 'Terms'} onClick={onClose} />
            <SheetDivider />
            <Row icon={Info} label={t.imprint ?? 'Imprint'} onClick={onClose} />
          </SheetGroup>

          {isLoggedIn && (
            <>
              <SectionLabel className='mt-6'>{t.account ?? 'Account'}</SectionLabel>
              <SheetGroup>
                <Row icon={LogOut} label={t.logout ?? 'Log out'} danger onClick={() => setSheet('logout')} />
              </SheetGroup>
            </>
          )}

          <div className='mt-6 flex items-center justify-center gap-2.5 text-[12.5px] font-semibold text-muted-foreground-2'>
            <a href='https://get-paypoint.de' target='_blank' rel='noopener noreferrer' className='flex items-center gap-2'>
              <span className='italic'>Powered by</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src='/paypoint.png' alt='PayPoint' className='h-10 w-auto object-contain opacity-80' />
            </a>
          </div>
        </div>
      </div>

      {/* Support */}
      <MobileSheet open={sheet === 'support'} onClose={() => setSheet('none')} title={t.contactSupport ?? 'Support'}>
        <div className='mb-3.5 text-center text-[13px] font-medium text-muted-foreground'>{t.supportHours}</div>
        <div className='flex flex-col gap-2.5'>
          {storeInfo?.phone && (
            <a href={`tel:${storeInfo.phone}`} className='flex items-center gap-3.5 rounded-[14px] bg-card p-[15px]'>
              <span className='flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-success/[0.14]'>
                <Phone className='h-[21px] w-[21px] text-success' strokeWidth={1.8} />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-[15px] font-bold text-white'>{t.callUs}</span>
                <span className='mt-px block truncate text-[12.5px] font-medium text-muted-foreground'>{storeInfo.phone}</span>
              </span>
            </a>
          )}
          {storeInfo?.email && (
            <a href={`mailto:${storeInfo.email}`} className='flex items-center gap-3.5 rounded-[14px] bg-card p-[15px]'>
              <span className='flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white/[0.08]'>
                <Mail className='h-[21px] w-[21px] text-white' strokeWidth={1.8} />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-[15px] font-bold text-white'>{t.emailUs}</span>
                <span className='mt-px block truncate text-[12.5px] font-medium text-muted-foreground'>{storeInfo.email}</span>
              </span>
            </a>
          )}
        </div>
      </MobileSheet>

      {/* Language */}
      <MobileSheet open={sheet === 'lang'} onClose={() => setSheet('none')} title={t.changeLanguage ?? 'Change language'}>
        <div className='flex flex-col gap-2.5'>
          {LANGUAGES.map((l) => {
            const active = language === l.code;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLanguage(l.code);
                  setSheet('none');
                }}
                className={cn('flex w-full items-center gap-3.5 rounded-[14px] border-2 p-[15px] text-left transition', active ? 'border-white bg-surface-3' : 'border-transparent bg-card')}>
                <span className='text-2xl leading-none'>{l.flag}</span>
                <span className='min-w-0 flex-1'>
                  <span className='block text-[15px] font-bold text-white'>{l.name}</span>
                  <span className='mt-0.5 block text-xs font-medium text-muted-foreground'>{l.sub}</span>
                </span>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-white bg-white' : 'border-fg-faint')}>
                  {active && <Check className='h-3 w-3 text-black' strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </MobileSheet>

      {/* Log out confirmation */}
      <MobileSheet open={sheet === 'logout'} onClose={() => setSheet('none')} title={t.logout ?? 'Log out'}>
        <p className='mb-4 text-center text-[13.5px] font-medium leading-relaxed text-muted-foreground'>{t.logoutConfirm ?? 'Are you sure you want to log out?'}</p>
        <button
          onClick={() => {
            clearUser();
            setSheet('none');
            onClose();
          }}
          className='h-[52px] w-full rounded-2xl bg-brand-red text-[15px] font-extrabold text-white transition active:scale-[0.98]'>
          {t.logout ?? 'Log out'}
        </button>
        <button onClick={() => setSheet('none')} className='mt-2.5 h-[52px] w-full rounded-2xl border-[1.5px] border-elevated text-[15px] font-bold text-white'>
          {t.cancel ?? 'Cancel'}
        </button>
      </MobileSheet>

      {loginOpen && <AuthenticationDialog isOpen={loginOpen} handleOpenChange={setLoginOpen} />}
    </div>
  );
}
