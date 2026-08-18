'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Menu as MenuIcon, Plus, Search, X } from 'lucide-react';

import MobileShell, { MobileScreen, SAFE_TOP } from '~/components/mobile/MobileShell';
import MobileSkeleton from '~/components/mobile/MobileSkeleton';
import { fetchMenuData, formatPrice, getCategories } from '~/lib/api';
import { cn, formatEtaRange, getImageURL, getPostalRateInfo, IMenuData, MenuProduct } from '~/lib/utils';
import SmartImage from '~/lib/SmartImage';
import { getStoreCover } from '~/lib/storeMedia';
import { getTodayTimings, isRestaurantOpen } from '~/lib/restaurantTimings';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { flyToCart } from '~/lib/flyToCart';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import UserDrawer from '~/components/Header/UserDrawer';
import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import CartToast from '~/components/menu/CartToast';
import ZoneCheckGate from '~/components/onboarding/ZoneCheckGate';
import { useZoneGate } from '~/hooks/useZoneGate';

/**
 * Mobile menu — the hub every other screen returns to.
 *
 * Structurally different from the desktop menu, not a narrow copy: a cover with
 * floating controls, a curved arch masking the seam, a logo badge straddling
 * it, then a sheet carrying the store block, a sticky category bar and the
 * product list.
 */
export default function MobileMenuScreen() {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const { cart, addToCart, totalItems, totalPrice } = useCart();
  const { deliveryAddress, setDeliveryAddress, setOrderType } = useAddress();
  const { toProduct, toCart } = useStoreNavigation();
  const { showGate, dismissGate } = useZoneGate();

  const [menuData, setMenuData] = useState<IMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [query, setQuery] = useState('');
  const catBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMenuData(storeInfo?.adminId, storeInfo?.storeId, storeInfo?.apiKey)
      .then((data) => {
        if (cancelled) return;
        setMenuData(data);
        const cats = getCategories(data);
        if (cats.length) setActiveCategory(cats[0].id);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [storeInfo?.adminId, storeInfo?.storeId, storeInfo?.apiKey]);

  const categories = menuData ? getCategories(menuData) : [];
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, products: c.products.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)) }))
      .filter((c) => c.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData, q]);

  // Scroll-spy over the section headings.
  useEffect(() => {
    if (!menuData || q) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActiveCategory(e.target.id.replace('mcat-', ''))), {
      rootMargin: '-80px 0px -70% 0px',
    });
    document.querySelectorAll('[id^="mcat-"]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [menuData, q]);

  // Keep the active chip in view as the list scrolls past its section.
  useEffect(() => {
    const bar = catBarRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${activeCategory}"]`);
    if (bar && chip) bar.scrollTo({ left: Math.max(0, chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2), behavior: 'smooth' });
  }, [activeCategory]);

  if (loading) return <MobileSkeleton />;

  const brand = storeInfo?.brandName || '';
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const cover = getStoreCover(storeInfo);
  const open = isRestaurantOpen(storeInfo?.timings || {});
  const { close } = getTodayTimings(storeInfo?.timings);
  const rate = getPostalRateInfo(Number(deliveryAddress?.postalCode || 0), storeInfo?.postalRates || []);
  const addrShort = deliveryAddress ? `${deliveryAddress.route ?? ''} ${deliveryAddress.streetNumber ?? ''}`.trim() || deliveryAddress.formattedAddress : t.deliveryAddress;

  const jumpTo = (id: string) => {
    setActiveCategory(id);
    document.getElementById(`mcat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <MobileShell>
      <MobileScreen>
        {/* Cover */}
        <div className='relative h-[226px]'>
          <div
            className='absolute inset-0 bg-card bg-cover'
            style={cover ? { backgroundImage: `url("${cover}")`, backgroundPosition: 'center 38%', filter: 'contrast(1.04) saturate(1.06) brightness(.94)' } : undefined}
          />
          <div className='absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0)_26%)]' />

          <div className='absolute inset-x-[18px] z-[6] flex items-center justify-center' style={{ top: SAFE_TOP }}>
            <button
              onClick={() => setAccountOpen(true)}
              aria-label={t.myAccount}
              className='absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-[8px]'>
              <MenuIcon className='h-5 w-5' strokeWidth={2} />
            </button>
            <button
              onClick={() => setAddressOpen(true)}
              className='inline-flex max-w-[74%] items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-2 text-[12.5px] font-bold text-white backdrop-blur-[8px]'>
              <MapPin className='h-[13px] w-[13px] shrink-0' strokeWidth={1.8} />
              <span className='min-w-0 truncate'>{addrShort}</span>
              <ChevronDown className='h-[13px] w-[13px] shrink-0' strokeWidth={2} />
            </button>
          </div>
        </div>

        {/*
          Arch: a curve cut out of the sheet so the cover appears to sit behind
          it, with the logo badge straddling the seam. Drawn as an SVG because a
          border-radius cannot produce this shape.
        */}
        <div className='relative z-[2] -mt-[52px]'>
          <svg viewBox='0 0 100 50' preserveAspectRatio='none' className='relative z-[1] block h-[52px] w-full' aria-hidden>
            <path d='M0,0 Q50,70 100,0 L100,52 L0,52 Z' className='fill-background' />
          </svg>
          {logo && (
            <div
              className='absolute left-1/2 top-[-18px] z-[7] h-[100px] w-[100px] -translate-x-1/2 rounded-3xl bg-black bg-[length:86%_auto] bg-center bg-no-repeat shadow-[0_12px_30px_-6px_rgba(0,0,0,0.75)]'
              style={{ backgroundImage: `url("${logo}")` }}
              aria-hidden
            />
          )}

          {/* Sheet */}
          <div className='relative z-[2] -mt-px bg-background px-[18px] pb-[120px] pt-11'>
            <h1 className='text-center text-[28px] font-black leading-[1.1] tracking-[-0.02em] text-white'>{brand}</h1>
            {storeInfo?.address && (
              <div className='mt-1.5 text-center text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground'>{storeInfo.address}</div>
            )}

            <div className='mt-2.5 flex items-center justify-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-fg-strong'>
              {rate.deliveryTime ? <span>{formatEtaRange(rate.deliveryTime)} min</span> : null}
              {rate.deliveryTime != null && rate.deliveryCharges != null && <span className='opacity-35'>·</span>}
              {rate.deliveryCharges != null && <span>{rate.deliveryCharges > 0 ? formatPrice(rate.deliveryCharges) : t.freeDelivery}</span>}
            </div>

            <div className='mt-1.5 flex items-center justify-center gap-1.5 text-[12px]'>
              <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-bold', open ? 'text-[#5fe39a]' : 'text-brand-red')}>
                <span className={cn('h-[7px] w-[7px] rounded-full', open ? 'anim-pulse-ring bg-[#5fe39a]' : 'bg-brand-red')} />
                {open ? `${t.openUntil} ${close}` : t.closed}
              </span>
            </div>

            {/* Sticky category bar */}
            <div className='sticky top-0 z-[9] -mx-[18px] mt-5 bg-background px-[18px] pb-2.5 pt-1'>
              <div className='flex items-center gap-1.5'>
                {searchOpen ? (
                  <div className='flex h-10 flex-1 items-center gap-2.5 rounded-full bg-card px-4'>
                    <Search className='h-4 w-4 shrink-0 text-muted-foreground' />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t.searchMenu}
                      aria-label={t.searchMenu}
                      className='min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-white'
                    />
                  </div>
                ) : (
                  <div ref={catBarRef} className='noscroll -ml-[18px] flex min-w-0 flex-1 gap-6 overflow-x-auto pl-[18px] pr-1.5'>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        data-chip={c.id}
                        onClick={() => jumpTo(c.id)}
                        className={cn(
                          'shrink-0 whitespace-nowrap py-1.5 text-[15px] transition',
                          activeCategory === c.id ? 'font-extrabold text-white' : 'font-semibold text-muted-foreground'
                        )}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchOpen((v) => !v);
                    setQuery('');
                  }}
                  aria-label={t.searchMenu}
                  className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition', searchOpen ? 'bg-primary text-selected-text' : 'bg-card text-white')}>
                  {searchOpen ? <X className='h-[18px] w-[18px]' /> : <Search className='h-[18px] w-[18px]' />}
                </button>
              </div>
            </div>

            {/* Sections */}
            {sections.map((section) => (
              <section key={section.id}>
                <div id={`mcat-${section.id}`} className='mt-[30px] flex scroll-mt-[70px] items-center gap-2.5'>
                  <span className='h-[22px] w-[5px] shrink-0 rounded-[3px] bg-primary' />
                  <h2 className='m-0 text-[25px] font-extrabold tracking-[-0.02em] text-white'>{section.name}</h2>
                </div>
                {section.products.map((product) => (
                  <MobileProductRow key={product.id} product={product} cart={cart} onAdd={addToCart} onOpen={() => toProduct(String(product.id))} />
                ))}
              </section>
            ))}

            {sections.length === 0 && (
              <div className='flex flex-col items-center px-5 py-16 text-center'>
                <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-card'>
                  <Search className='h-9 w-9 text-fg-faint' />
                </div>
                <div className='mt-5 text-lg font-extrabold'>{t.noResults}</div>
                <button onClick={() => setQuery('')} className='mt-5 h-[46px] rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
                  {t.resetSearch}
                </button>
              </div>
            )}
          </div>
        </div>
      </MobileScreen>

      {/*
        Cart pill. Not a floating button: the design anchors it to the bottom
        edge, full width, rounded only along its top, and slides it up.
      */}
      {totalItems > 0 && (
        <button
          onClick={toCart}
          data-cart-target='1'
          className='absolute inset-x-0 bottom-0 z-[20] flex items-center gap-3.5 rounded-t-[18px] bg-primary px-5 text-selected-text shadow-[0_-8px_24px_rgba(0,0,0,0.45)] transition active:scale-[0.99]'
          style={{
            height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            animation: 'dzslideup .3s ease both',
          }}>
          {/* Inverted against the pill, so the count stays legible whatever
              accent the store has set. */}
          <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-selected-text text-sm font-extrabold text-primary'>{totalItems}</span>
          <span className='min-w-0 flex-1 truncate text-left text-[16.5px] font-extrabold tracking-[-0.01em]'>{t.viewOrder}</span>
          <span className='shrink-0 whitespace-nowrap text-[16.5px] font-extrabold'>{formatPrice(totalPrice)}</span>
        </button>
      )}
      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
      <DeliveryAddressModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSelect={(addr) => {
          setDeliveryAddress(addr);
          setAddressOpen(false);
        }}
        googleApiKey={storeInfo?.posGoogleApiKey || ''}
        onSuccess={() => setOrderType('delivery')}
      />
      <CartToast />
      {showGate && <ZoneCheckGate onDone={dismissGate} />}
    </MobileShell>
  );
}

/** Product row: text left, 118×79 photo right, quantity badge and add button over it. */
function MobileProductRow({
  product,
  cart,
  onAdd,
  onOpen,
}: {
  product: MenuProduct;
  cart: ReturnType<typeof useCart>['cart'];
  onAdd: ReturnType<typeof useCart>['addToCart'];
  onOpen: () => void;
}) {
  const storeInfo = useStore();
  const logoURL = storeInfo?.settings?.logo || '';
  const hasPhoto = !!product.images?.length;
  const img = hasPhoto ? getImageURL(product.images[0]) : logoURL;

  const line = cart.find((i) => i.product.id === product.id);
  const qty = line?.quantity ?? 0;
  const requiresModal = product.haveCustomizations && (product.addOns || []).some((g) => (g.minimumQuantity ?? 0) > 0);

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    // Anything with a required option group has to be configured first.
    if (requiresModal) {
      onOpen();
      return;
    }
    flyToCart(e.currentTarget, img || '');
    onAdd(product, 1, {});
  };

  return (
    <div onClick={onOpen} role='button' tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()} className='relative mt-5 flex cursor-pointer items-start gap-3'>
      {/* An in-cart line is marked with a rule down its left edge. */}
      {qty > 0 && <span className='absolute -left-[13px] bottom-2.5 top-2.5 w-[5px] rounded-[3px] bg-primary' />}
      <div className='min-w-0 flex-1'>
        <div className='text-[16.5px] font-bold leading-[1.25] tracking-[-0.01em] text-white'>
          {qty > 0 && <span className='mr-1.5 font-extrabold'>{qty}×</span>}
          {product.name}
        </div>
        {product.description && <div className='mt-1 text-sm font-medium leading-[1.35] text-muted-foreground'>{product.description}</div>}
        <div className='mt-1.5 text-[15px] font-extrabold text-white'>{formatPrice(product.currentPrice)}</div>
      </div>

      <div className='relative shrink-0'>
        {hasPhoto ? (
          <SmartImage src={img} alt={product.name} sizes='118px' className='object-cover' wrapperClassName='h-[79px] w-[118px] rounded-xl' />
        ) : (
          <div className='h-[46px] w-[46px]' />
        )}
        {qty > 0 && (
          <div className='anim-pop absolute -right-2 -top-2 z-[2] flex h-[25px] min-w-[25px] items-center justify-center rounded-[13px] border-[3px] border-background bg-primary px-1.5 text-[12.5px] font-extrabold text-selected-text'>
            {qty}
          </div>
        )}
        <button
          onClick={add}
          aria-label='Add'
          className='absolute -bottom-[7px] -right-[7px] flex h-[31px] w-[31px] items-center justify-center rounded-full border-[3px] border-background bg-primary text-selected-text transition active:scale-[0.85]'>
          <Plus className='h-4 w-4' strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
