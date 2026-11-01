'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, ChevronDown, Info, MapPin, Menu as MenuIcon, Plus, Search, UtensilsCrossed, X } from 'lucide-react';

import MobileShell, { MobileScreen, SAFE_TOP } from '~/components/mobile/MobileShell';
import MobileSkeleton from '~/components/mobile/MobileSkeleton';
import { formatPrice, getCategories } from '~/lib/api';
import { cn, formatEtaRange, getImageURL, MenuProduct } from '~/lib/utils';
import SmartImage from '~/lib/SmartImage';
import { canOptimizeImage } from '~/lib/imageHosts';
import { getStoreCover } from '~/lib/storeMedia';
import { deliveryLaterLabel, nextOpeningLabel, orderingStatus } from '~/lib/restaurantTimings';
import { formatStoreAddress } from '~/lib/storeAddress';
import { hasOptions, isSoldOut, requiresConfiguration } from '~/lib/productConfig';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { flyToCart } from '~/lib/flyToCart';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { usePickupNow } from '~/hooks/usePickupNow';
import UserDrawer from '~/components/Header/UserDrawer';
import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import CartToast from '~/components/menu/CartToast';
import ZoneCheckGate from '~/components/onboarding/ZoneCheckGate';
import { useZoneGate } from '~/hooks/useZoneGate';
import { useMenu } from '~/hooks/useMenu';
import MobileRestaurantInfoSheet from '~/components/mobile/MobileRestaurantInfoSheet';
import SoldOutLabel from '~/components/SoldOutLabel';
import MobileCartRemovedNotice from '~/components/mobile/MobileCartRemovedNotice';

/**
 * Where the menu list was scrolled to, per store, for this browser session.
 * The menu is unmounted while a product or the cart is open, and coming back
 * used to start at the top every time.
 */
const savedScroll = new Map<string, number>();

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
  const { deliveryAddress, setDeliveryAddress, setOrderType, deliveryRate, orderType } = useAddress();
  const pickupNow = usePickupNow();
  const { toProduct, toCart } = useStoreNavigation();
  const { showGate, dismissGate } = useZoneGate();

  // Shared with the product screen and kept for the session, so coming back
  // from a product shows the menu at once instead of a skeleton.
  const { menuData, loading, error } = useMenu();
  const [activeCategory, setActiveCategory] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  // While a chip's smooth scroll runs, the spy would light up every section it passes.
  const spyPausedUntil = useRef(0);
  const [query, setQuery] = useState('');
  const catBarRef = useRef<HTMLDivElement>(null);
  // The cover is the first child of the scrolling sheet; its parent scrolls.
  const coverRef = useRef<HTMLDivElement>(null);
  const scrollKey = storeInfo?.slug || 'default';

  const categories = menuData ? getCategories(menuData) : [];
  const q = query.trim().toLowerCase();
  // The first section until the scroll-spy or a tap picks one.
  const shownCategory = activeCategory || categories[0]?.id || '';

  // Same match as the desktop menu: name, description, or the category's name.
  const sections = useMemo(() => {
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
      }))
      .filter((c) => c.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData, q]);

  /*
   * Remember the list's position as it scrolls, and put it back when the menu
   * is shown again — before paint, so it does not visibly jump.
   */
  const hasMenu = !!menuData && !loading;
  useLayoutEffect(() => {
    const scroller = coverRef.current?.parentElement;
    if (!hasMenu || !scroller) return;
    const top = savedScroll.get(scrollKey);
    if (top) scroller.scrollTop = top;
    const onScroll = () => savedScroll.set(scrollKey, scroller.scrollTop);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [hasMenu, scrollKey]);

  // Scroll-spy over the section headings.
  useEffect(() => {
    if (!menuData || q) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < spyPausedUntil.current) return;
        entries.forEach((e) => e.isIntersecting && setActiveCategory(e.target.id.replace('mcat-', '')));
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );
    document.querySelectorAll('[id^="mcat-"]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [menuData, q]);

  // Keep the active chip in view as the list scrolls past its section.
  useEffect(() => {
    const bar = catBarRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-chip="${shownCategory}"]`);
    if (bar && chip) bar.scrollTo({ left: Math.max(0, chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2), behavior: 'smooth' });
  }, [shownCategory]);

  if (loading) return <MobileSkeleton />;

  const brand = storeInfo?.brandName || '';
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const cover = getStoreCover(storeInfo);
  const storeAddress = formatStoreAddress(storeInfo);
  /*
   * By the hours of the selected order type: a delivery reads the store's
   * delivery hours when it has its own. Delivery not started yet while pickup
   * is open is its own state, not "Geschlossen".
   */
  const status = orderingStatus(storeInfo, orderType);
  const open = status.state === 'open';
  const close = status.state === 'open' ? status.close : '';
  const deliveryLater = status.state === 'deliveryLater' ? status : null;
  const opensNext = status.state === 'closed' ? nextOpeningLabel(storeInfo, t, undefined, orderType) : null;
  const pickupOffered = !storeInfo?.tableInfo?.token && (storeInfo?.settings?.orderTypes?.takeaway ?? true);
  // Same rule as the address context: no delivery at a table or when the store has it off.
  const deliveryOffered = !storeInfo?.tableInfo?.token && (storeInfo?.settings?.orderTypes?.delivery ?? false);
  // Menu states: nothing loaded at all, or loaded and empty. A failed refresh
  // with an older copy on screen keeps the menu and adds a banner.
  const menuFailed = !menuData && !!error;
  const menuEmpty = !!menuData && categories.length === 0;
  // The server's delivery terms for this address, as checkout uses them.
  const rate = deliveryRate;
  const addrShort = deliveryAddress ? `${deliveryAddress.route ?? ''} ${deliveryAddress.streetNumber ?? ''}`.trim() || deliveryAddress.formattedAddress : t.deliveryAddress;

  const jumpTo = (id: string) => {
    spyPausedUntil.current = Date.now() + 1200;
    setActiveCategory(id);
    document.getElementById(`mcat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <MobileShell>
      <MobileScreen>
        {/* Cover */}
        <div ref={coverRef} className='relative h-[226px]'>
          {/*
            An optimised <Image> rather than a CSS background: the cover was
            the original upload (~600 KB) on every first open. Same crop
            (object-position = the old background-position) and filter.
          */}
          <div className='absolute inset-0 overflow-hidden bg-card'>
            {cover && (
              <Image
                src={cover}
                alt=''
                fill
                preload
                sizes='(max-width: 440px) 100vw, 440px'
                unoptimized={!canOptimizeImage(cover)}
                className='object-cover'
                style={{ objectPosition: 'center 38%', filter: 'contrast(1.04) saturate(1.06) brightness(.94)' }}
              />
            )}
          </div>
          <div className='absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0)_26%)]' />

          <div className='absolute inset-x-[18px] z-[6] flex items-center justify-center' style={{ top: SAFE_TOP }}>
            {/* 40px circle drawn, 44px hit area (::after). */}
            <button
              onClick={() => setAccountOpen(true)}
              aria-label={t.myAccount}
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-[8px] after:absolute after:-inset-0.5 after:rounded-full after:content-['']">
              <MenuIcon className='h-5 w-5' strokeWidth={2} />
            </button>
            {/* The address only matters where the store delivers. */}
            {deliveryOffered && (
              <button
                onClick={() => setAddressOpen(true)}
                aria-label={`${t.changeDeliveryAddress}: ${addrShort}`}
                className="relative inline-flex max-w-[74%] items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-2 text-[12.5px] font-bold text-white backdrop-blur-[8px] after:absolute after:inset-x-0 after:-inset-y-[5px] after:content-['']">
                <MapPin className='h-[13px] w-[13px] shrink-0' strokeWidth={1.8} />
                <span className='min-w-0 truncate'>{addrShort}</span>
                <ChevronDown className='h-[13px] w-[13px] shrink-0' strokeWidth={2} />
              </button>
            )}
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
          {/*
            Logo badge: the whole logo, contained, on the card surface — a
            tall logo was cropped by a width-fitted background, and dark
            lettering vanished on black. Same 100px badge.
          */}
          {logo && (
            <div
              className='absolute left-1/2 top-[-18px] z-[7] h-[100px] w-[100px] -translate-x-1/2 overflow-hidden rounded-3xl border border-border-strong bg-card shadow-[0_12px_30px_-6px_rgba(0,0,0,0.75)]'
              aria-hidden>
              <SmartImage src={logo} alt='' sizes='100px' className='object-contain p-2' />
            </div>
          )}

          {/* Sheet */}
          <div className='relative z-[2] -mt-px bg-background px-[18px] pb-[120px] pt-11'>
            <h1 className='text-center text-[28px] font-black leading-[1.1] tracking-[-0.02em] text-white'>{brand}</h1>
            {/*
              The address line opens the restaurant info (hours, phone,
              imprint). An ⓘ marks it as tappable; ::after makes the 18px
              line a 44px target without moving anything.
            */}
            <div className='mt-1.5 flex justify-center'>
              <button
                type='button'
                onClick={() => setInfoOpen(true)}
                aria-label={storeAddress ? `${t.restaurantInfo}: ${storeAddress}` : t.restaurantInfo}
                className="relative max-w-full text-center text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground after:absolute after:inset-x-0 after:-inset-y-[13px] after:content-['']">
                {storeAddress}
                <Info className={cn('inline-block h-[13px] w-[13px] align-[-2px]', storeAddress && 'ml-1.5')} strokeWidth={2.4} />
              </button>
            </div>

            {deliveryOffered && (
              <div className='mt-2.5 flex items-center justify-center gap-1.5 whitespace-nowrap text-[12px] font-semibold text-fg-strong'>
                {rate.deliveryTime ? (
                  <span>
                    {formatEtaRange(rate.deliveryTime)} {t.minutesShort}
                  </span>
                ) : null}
                {rate.deliveryTime != null && rate.deliveryCharges != null && <span className='opacity-35'>·</span>}
                {rate.deliveryCharges != null && <span>{rate.deliveryCharges > 0 ? formatPrice(rate.deliveryCharges) : t.freeDelivery}</span>}
              </div>
            )}

            <div className='mt-1.5 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[12px]'>
              {deliveryLater ? (
                /*
                 * Delivery starts later, pickup is open now: say when, and let
                 * "Abholung jetzt möglich" switch to pickup (44px hit area via
                 * ::after). A delivery time is pre-ordered from the cart.
                 */
                <>
                  <span className='inline-flex items-center gap-1.5 text-[13px] font-bold text-warning'>
                    <span className='h-[7px] w-[7px] rounded-full bg-warning' />
                    {deliveryLaterLabel(deliveryLater.deliveryOpensAt, t)}
                  </span>
                  {pickupOffered && (
                    <>
                      <span className='text-[13px] font-bold text-muted-foreground opacity-60'>·</span>
                      <button
                        type='button'
                        onClick={pickupNow}
                        className="relative text-[13px] font-bold text-link after:absolute after:inset-x-0 after:-inset-y-[13px] after:content-['']">
                        {t.pickupPossibleNow}
                      </button>
                    </>
                  )}
                </>
              ) : (
              <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-bold', open ? 'text-[#5fe39a]' : 'text-brand-red')}>
                <span className={cn('h-[7px] w-[7px] rounded-full', open ? 'anim-pulse-ring bg-[#5fe39a]' : 'bg-brand-red')} />
                {open ? `${t.openUntil} ${close}` : t.closed}
              </span>
              )}
              {opensNext && (
                <>
                  <span className='text-[13px] font-bold text-muted-foreground opacity-60'>·</span>
                  <span className='text-[13px] font-semibold text-fg-strong'>{opensNext}</span>
                </>
              )}
            </div>

            {/* Sticky category bar */}
            {/*
              Chips are 44px tall now (were 35) for the tap target; the bar
              gives back the padding, so its height (54px) and the text
              position stay as they were.
            */}
            {!menuFailed && !menuEmpty && (
            <div className='sticky top-0 z-[9] -mx-[18px] mt-5 bg-background px-[18px] pb-2 pt-0.5'>
              <div className='flex min-h-11 items-center gap-1.5'>
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
                          'h-11 shrink-0 whitespace-nowrap text-[15px] transition',
                          shownCategory === c.id ? 'font-extrabold text-white' : 'font-semibold text-muted-foreground'
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
                  aria-label={searchOpen ? t.clearSearch : t.searchMenu}
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition after:absolute after:-inset-0.5 after:rounded-full after:content-['']",
                    searchOpen ? 'bg-primary text-selected-text' : 'bg-card text-white'
                  )}>
                  {searchOpen ? <X className='h-[18px] w-[18px]' /> : <Search className='h-[18px] w-[18px]' />}
                </button>
              </div>
            </div>
            )}

            {/* A refresh failed but an older copy is on screen. */}
            {error && menuData && (
              <div className='mt-4 flex items-center gap-3 rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3.5'>
                <AlertCircle className='h-5 w-5 shrink-0 text-warning' strokeWidth={1.8} />
                <div className='min-w-0 flex-1'>
                  <div className='text-[14px] font-extrabold text-white'>{t.menuUnavailable}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-fg-secondary'>{t.menuLoadFailedSub}</div>
                </div>
                <button onClick={() => window.location.reload()} className='h-11 shrink-0 rounded-[12px] bg-primary px-3.5 text-[13.5px] font-extrabold text-selected-text'>
                  {t.reload}
                </button>
              </div>
            )}

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

            {/* Nothing loaded: a German sentence and a way to try again — never the technical error. */}
            {menuFailed && (
              <div className='flex flex-col items-center px-5 py-16 text-center'>
                <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-card'>
                  <AlertCircle className='h-9 w-9 text-warning' strokeWidth={1.8} />
                </div>
                <div className='mt-5 text-lg font-extrabold'>{t.menuUnavailable}</div>
                <button onClick={() => window.location.reload()} className='mt-5 h-[46px] rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
                  {t.reload}
                </button>
              </div>
            )}

            {menuEmpty && (
              <div className='flex flex-col items-center px-5 py-16 text-center'>
                <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-card'>
                  <UtensilsCrossed className='h-9 w-9 text-fg-faint' />
                </div>
                <div className='mt-5 text-lg font-extrabold'>{t.menuEmpty}</div>
              </div>
            )}

            {!menuFailed && !menuEmpty && sections.length === 0 && (
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

      {/* Lines the last menu check took out of the cart — said here, as the desktop menu says it inline. */}
      <MobileCartRemovedNotice />

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
      <MobileRestaurantInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
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
  const { t } = useLanguage();
  const logoURL = storeInfo?.settings?.logo || '';
  const hasPhoto = !!product.images?.length;
  const img = hasPhoto ? getImageURL(product.images[0]) : logoURL;
  const soldOut = isSoldOut(product);

  // Every line of this product — sizes, extras and notes are separate lines.
  const qty = cart.filter((i) => i.product.id === product.id).reduce((sum, i) => sum + i.quantity, 0);
  /*
   * The "+" adds in one tap only what has nothing to choose. A size, a
   * required group or optional extras open the product screen — the "+" put
   * a pizza with sizes in the cart with none chosen (1.11.2026). A sold-out
   * product shows no "+", and opens the screen (which cannot add it) if
   * one is ever reached.
   */
  const opensScreen = requiresConfiguration(product) || hasOptions(product) || soldOut;
  const skus = product.skus ?? [];
  const orderable = skus.filter((sku) => sku.available !== false);
  const fromPrice = skus.length > 1 ? Math.min(...(orderable.length ? orderable : skus).map((sku) => sku.price)) : null;

  const add = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (opensScreen) {
      onOpen();
      return;
    }
    flyToCart(e.currentTarget, img || '');
    onAdd(product, 1, {});
  };

  return (
    <div onClick={onOpen} role='button' tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()} className='relative mt-5 flex cursor-pointer items-start gap-3'>
      {/* An in-cart line is marked with a rule down its left edge. */}
      {qty > 0 && !soldOut && <span className='absolute -left-[13px] bottom-2.5 top-2.5 w-[5px] rounded-[3px] bg-primary' />}
      <div className='min-w-0 flex-1'>
        <div className={cn(soldOut && 'opacity-50')}>
          <div className='text-[16.5px] font-bold leading-[1.25] tracking-[-0.01em] text-white'>
            {qty > 0 && !soldOut && <span className='mr-1.5 font-extrabold'>{qty}×</span>}
            {product.name}
          </div>
          {product.description && <div className='mt-1 text-sm font-medium leading-[1.35] text-muted-foreground'>{product.description}</div>}
        </div>
        <div className='mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1'>
          <span className={cn('text-[15px] font-extrabold text-white', soldOut && 'opacity-50')}>
            {fromPrice != null ? `${t.from} ${formatPrice(fromPrice)}` : formatPrice(product.currentPrice)}
          </span>
          {soldOut && <SoldOutLabel />}
        </div>
      </div>

      <div className='relative shrink-0'>
        {hasPhoto ? (
          <SmartImage
            src={img}
            alt={product.name}
            // Covered, not contained: a 16:9 photo in the 118×79 slot is drawn ~140px wide.
            sizes='140px'
            className='object-cover'
            wrapperClassName={cn('h-[79px] w-[118px] rounded-xl', soldOut && 'opacity-40 grayscale')}
          />
        ) : (
          <div className='h-[46px] w-[46px]' />
        )}
        {!soldOut && qty > 0 && (
          <div className='anim-pop absolute -right-2 -top-2 z-[2] flex h-[25px] min-w-[25px] items-center justify-center rounded-[13px] border-[3px] border-background bg-primary px-1.5 text-[12.5px] font-extrabold text-selected-text'>
            {qty}
          </div>
        )}
        {/*
          Sold out: no "+" at all. 31px circle drawn, 45px hit area: the
          ::after is placed against the padding box (inside the 3px border),
          so 25px + 2×10px.
        */}
        {!soldOut && (
          <button
            onClick={add}
            aria-label={`${t.add}: ${product.name}`}
            className="absolute -bottom-[7px] -right-[7px] flex h-[31px] w-[31px] items-center justify-center rounded-full border-[3px] border-background bg-primary text-selected-text transition after:absolute after:-inset-[10px] after:rounded-full after:content-[''] active:scale-[0.85]">
            <Plus className='h-4 w-4' strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
}
