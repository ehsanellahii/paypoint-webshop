/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Heart, ShoppingBag, Ticket, MessageSquare, Globe, Shield, FileText, Info, LogOut, ChevronRight, User, ArrowLeft, Copy, Check, Gift } from 'lucide-react';
import { useUser } from '~/contexts/user-context';
import AuthenticationDialog from '../dialogs/Authentication/AuthenticationDialog';
import ProfileDialog from '../dialogs/ProfileDialog';
import FavoritesPanel from '../dialogs/FavoriteItems/FavoritesPanel';
import OrdersPanel from './OrdersPanel';
import ProductModal from '../dialogs/ProductModal';
import { MenuProduct } from '~/lib/utils';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { getPlacedOrder } from '~/lib/lastOrder';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenOrders: () => void;
  storeSlug?: string;
};

type View = 'home' | 'invite' | 'lang' | 'orders' | 'favorites';

const LANGUAGES: { code: 'de' | 'en'; name: string; sub: string; flag: string }[] = [
  { code: 'de', name: 'Deutsch', sub: 'Deutschland', flag: '🇩🇪' },
  { code: 'en', name: 'English', sub: 'Englisch', flag: '🇬🇧' },
];

export default function UserDrawer({ open, onClose }: Props) {
  const { t, language, setLanguage } = useLanguage();
  const { user, clearUser } = useUser();
  const storeInfo = useStore();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isLoggedIn = !!user && !user?.isGuest;

  const [view, setView] = useState<View>('home');
  const [copied, setCopied] = useState(false);
  const [liveOrder, setLiveOrder] = useState(false);
  const { toMenu } = useStoreNavigation();
  const [dialogs, setDialogs] = useState({ login: false, register: false, profile: false, singleProductDetails: false });
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);

  useEffect(() => {
    if (!open) return;
    setView('home');
    // A recently placed order (this session) is treated as "live".
    setLiveOrder(!!getPlacedOrder(storeInfo?.slug || 'default'));
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : null) || (t.guest ?? 'Guest');
  // The customer's real referral code, issued by the backend on account creation.
  const referralCode = user?.promoCode ?? '';

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      /* clipboard unavailable — non-critical */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const QuickAction = ({ icon: Icon, label, onClick, live }: { icon: typeof Heart; label: string; onClick: () => void; live?: boolean }) => (
    <button onClick={onClick} className='relative flex flex-1 flex-col items-center gap-3 rounded-2xl bg-surface-3 px-2 pb-3 pt-4 transition hover:bg-elevated'>
      {live && (
        <span className='absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#ef4444] px-1.5 py-[3px]' style={{ animation: 'wzpulse 1.6s ease-in-out infinite' }}>
          <span className='h-[5px] w-[5px] rounded-full bg-white' />
          <span className='text-[8px] font-extrabold tracking-[0.06em] text-white'>LIVE</span>
        </span>
      )}
      <Icon className='h-6 w-6' />
      <span className='text-xs font-bold'>{label}</span>
    </button>
  );

  const Row = ({ icon: Icon, label, value, onClick, danger }: { icon: typeof Heart; label: string; value?: string; onClick: () => void; danger?: boolean }) => (
    <button onClick={onClick} className='flex w-full items-center gap-3.5 px-4 py-[15px] text-left transition hover:bg-white/[0.03]'>
      <Icon className={`h-[21px] w-[21px] ${danger ? 'text-brand-red' : ''}`} />
      <span className={`flex-1 text-[15px] font-semibold ${danger ? 'text-brand-red' : ''}`}>{label}</span>
      {value && <span className='text-[13px] font-bold'>{value}</span>}
      {!danger && <ChevronRight className='h-4 w-4 text-[#55575c]' />}
    </button>
  );

  return (
    <div className='fixed inset-0 z-50'>
      <button aria-label='Close menu' className='absolute inset-0 bg-black/55' onClick={onClose} />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-label='User menu'
        className='anim-drawer absolute right-0 top-0 flex h-full w-[400px] max-w-[92vw] flex-col border-l border-border bg-card outline-none'>
        {/* Header with brand tiles */}
        <div className='relative h-[150px] shrink-0 overflow-hidden'>
          <div className='absolute -inset-5 flex flex-wrap content-center justify-center gap-x-[22px] gap-y-2.5 overflow-hidden bg-[#161618] -rotate-12 select-none'>
            {Array.from({ length: 48 }).map((_, i) => (
              <span key={i} className='whitespace-nowrap font-script text-[17px] leading-none text-white/[0.05]'>
                {storeInfo?.brandName || 'Restaurant'}
              </span>
            ))}
          </div>
          <div className='absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.3)] via-transparent to-card' />
          <button onClick={onClose} aria-label='Close' className='absolute right-[18px] top-[18px] flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur'>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </button>
          <div className='absolute bottom-[18px] left-[22px]'>
            {isLoggedIn ? (
              <>
                <div className='text-[12px] font-bold uppercase tracking-[0.04em] text-[#9a9da3]'>{t.welcomeBack ?? 'Welcome back'}</div>
                <div className='mt-1 text-2xl font-extrabold tracking-tight'>{displayName}</div>
              </>
            ) : (
              <div className='text-2xl font-extrabold tracking-tight'>{t.myAccount ?? 'My account'}</div>
            )}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto scrollbar-hide px-5 pb-7 pt-[18px]'>
          {view === 'invite' ? (
            <>
              <button onClick={() => setView('home')} className='mb-3.5 inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-surface-3 px-3 text-[13px] font-bold'>
                <ArrowLeft className='h-4 w-4' /> {t.invite ?? 'Invite'}
              </button>
              <div className='text-center'>
                <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-success to-[#1f9f60]'>
                  <Gift className='h-10 w-10 text-[#0d1f14]' />
                </div>
                <h2 className='mt-4 text-[22px] font-extrabold leading-tight tracking-tight'>{t.inviteTitle ?? '€5 for you, €5 for your friends'}</h2>
                <p className='mt-2.5 text-[13.5px] font-medium leading-relaxed text-[#a9adb3]'>{t.inviteSub ?? 'Share your code. On your friend’s first order you both get €5.'}</p>
              </div>
              {referralCode ? (
                <div className='mt-5 flex items-center gap-3 rounded-[14px] border border-dashed border-[#45474b] bg-surface-3 px-4 py-3.5'>
                  <span className='flex-1 break-all text-[17px] font-extrabold tracking-[0.06em]'>{referralCode}</span>
                  <button onClick={copyCode} className='inline-flex shrink-0 items-center gap-1.5 rounded-[11px] bg-primary px-3.5 py-2 text-[13px] font-extrabold text-selected-text'>
                    {copied ? <Check className='h-[15px] w-[15px]' strokeWidth={2.6} /> : <Copy className='h-[15px] w-[15px]' />}
                    {copied ? (t.copied ?? 'Copied!') : (t.copy ?? 'Copy')}
                  </button>
                </div>
              ) : (
                <div className='mt-5 rounded-[14px] border border-dashed border-[#45474b] bg-surface-3 px-4 py-4 text-center text-[13.5px] font-medium text-muted-foreground'>
                  {t.noReferralCode ?? 'No referral code available for your account yet.'}
                </div>
              )}
            </>
          ) : view === 'favorites' ? (
            <>
              <button onClick={() => setView('home')} className='mb-3.5 inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-surface-3 px-3 text-[13px] font-bold'>
                <ArrowLeft className='h-4 w-4' /> {t.favoriteProducts ?? 'Favorites'}
              </button>
              <FavoritesPanel
                active={view === 'favorites'}
                onOpenProduct={(product) => {
                  setSelectedProduct(product);
                  setDialogs((p) => ({ ...p, singleProductDetails: true }));
                }}
                onBrowse={() => {
                  onClose();
                  toMenu();
                }}
              />
            </>
          ) : view === 'orders' ? (
            <>
              <button onClick={() => setView('home')} className='mb-3.5 inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-surface-3 px-3 text-[13px] font-bold'>
                <ArrowLeft className='h-4 w-4' /> {t.orders ?? 'Orders'}
              </button>
              <OrdersPanel active={view === 'orders'} wrapperClassName='px-0' compact onReordered={onClose} />
            </>
          ) : view === 'lang' ? (
            <>
              <button onClick={() => setView('home')} className='mb-3.5 inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-surface-3 px-3 text-[13px] font-bold'>
                <ArrowLeft className='h-4 w-4' /> {t.changeLanguage ?? 'Change language'}
              </button>
              <div className='flex flex-col gap-2.5'>
                {LANGUAGES.map((l) => {
                  const active = language === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`flex w-full items-center gap-3.5 rounded-[14px] border-2 p-[15px] text-left transition ${active ? 'border-white bg-elevated' : 'border-transparent bg-surface-3'}`}>
                      <span className='text-2xl leading-none'>{l.flag}</span>
                      <span className='min-w-0 flex-1'>
                        <span className='block text-[15px] font-bold'>{l.name}</span>
                        <span className='mt-0.5 block text-xs font-medium text-muted-foreground'>{l.sub}</span>
                      </span>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-white bg-white' : 'border-[#55575c]'}`}>
                        {active && <Check className='h-3 w-3 text-black' strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Guest / member top */}
              {isLoggedIn ? (
                <div className='flex gap-2.5'>
                  <QuickAction icon={Heart} label={t.favoriteProducts ?? 'Favorites'} onClick={() => setView('favorites')} />
                  <QuickAction icon={ShoppingBag} label={t.orders ?? 'Orders'} live={liveOrder} onClick={() => setView('orders')} />
                  <QuickAction icon={Ticket} label={t.invite ?? 'Invite'} onClick={() => setView('invite')} />
                </div>
              ) : (
                <>
                  <div className='flex items-center gap-3.5 rounded-2xl border border-border bg-surface-3 p-4'>
                    <span className='flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white/[0.08]'>
                      <User className='h-[22px] w-[22px]' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <div className='text-[15px] font-bold'>{t.orderingAsGuest ?? 'You’re ordering as a guest'}</div>
                      <div className='mt-0.5 text-[12.5px] font-medium leading-snug text-muted-foreground'>{t.orderingAsGuestSub ?? 'Sign in for favorites, order history & rewards.'}</div>
                    </div>
                  </div>
                  <button onClick={() => setDialogs((p) => ({ ...p, login: true }))} className='mt-3 h-[52px] w-full rounded-[15px] bg-primary text-[15px] font-extrabold text-selected-text active:scale-[0.98]'>
                    {t.login ?? 'Sign in'}
                  </button>
                </>
              )}

              {/* Help */}
              <div className='mb-2.5 mt-6 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground'>{t.help ?? 'Help'}</div>
              <div className='overflow-hidden rounded-2xl bg-surface-3'>
                <Row icon={MessageSquare} label={t.contactSupport ?? 'Contact support'} onClick={() => (storeInfo?.phone ? window.open(`tel:${storeInfo.phone}`) : undefined)} />
                <div className='ml-[51px] h-px bg-white/[0.06]' />
                <Row icon={Globe} label={t.changeLanguage ?? 'Change language'} value={language.toUpperCase()} onClick={() => setView('lang')} />
              </div>

              {/* Legal */}
              <div className='mb-2.5 mt-6 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground'>{t.legal ?? 'Legal'}</div>
              <div className='overflow-hidden rounded-2xl bg-surface-3'>
                <Row icon={Shield} label={t.privacy ?? 'Privacy'} onClick={onClose} />
                <div className='ml-[51px] h-px bg-white/[0.06]' />
                <Row icon={FileText} label={t.terms ?? 'Terms'} onClick={onClose} />
                <div className='ml-[51px] h-px bg-white/[0.06]' />
                <Row icon={Info} label={t.imprint ?? 'Imprint'} onClick={onClose} />
              </div>

              {/* Account */}
              {isLoggedIn && (
                <>
                  <div className='mb-2.5 mt-6 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground'>{t.account ?? 'Account'}</div>
                  <div className='overflow-hidden rounded-2xl bg-surface-3'>
                    <Row icon={User} label={t.profile ?? 'Profile'} onClick={() => setDialogs((p) => ({ ...p, profile: true }))} />
                    <div className='ml-[51px] h-px bg-white/[0.06]' />
                    <Row icon={LogOut} label={t.logout ?? 'Log out'} danger onClick={() => { clearUser(); onClose(); }} />
                  </div>
                </>
              )}

              <div className='mt-6 flex items-center justify-center gap-2.5 text-[12.5px] font-semibold text-muted-foreground-2'>
                <a href='https://get-paypoint.de' target='_blank' rel='noopener noreferrer' className='flex items-center gap-2'>
                  <span className='italic'>Powered by</span>
                  <img src='/paypoint.png' alt='PayPoint' className='h-10 w-auto object-contain opacity-80' />
                </a>
              </div>
            </>
          )}
        </div>
      </aside>

      {dialogs.login && <AuthenticationDialog isOpen={dialogs.login} handleOpenChange={(o) => setDialogs((p) => ({ ...p, login: o }))} />}
      {dialogs.register && <AuthenticationDialog isOpen={dialogs.register} handleOpenChange={(o) => setDialogs((p) => ({ ...p, register: o }))} isRegistration />}
      {dialogs.profile && <ProfileDialog isOpen={dialogs.profile} handleOpenChange={(o) => setDialogs((p) => ({ ...p, profile: o }))} />}
      {dialogs.singleProductDetails && <ProductModal product={selectedProduct} isOpen={dialogs.singleProductDetails} onClose={() => setDialogs((p) => ({ ...p, singleProductDetails: false }))} />}
    </div>
  );
}
