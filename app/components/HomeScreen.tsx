'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, AlertCircle, UtensilsCrossed, X } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductModal from '~/components/dialogs/ProductModal';
import Footer from '@/components/Footer';
import MenuHeader from '~/components/menu/MenuHeader';
import MenuHero from '~/components/menu/MenuHero';
import MenuMetaBar from '~/components/menu/MenuMetaBar';
import CategoryNavBar from '~/components/menu/CategoryNavBar';
import BottomBar from '~/components/Cart/BottomBar';
import Cart from '~/components/Cart/Cart';
import OrdersDialog from '~/components/Header/OrdersDialog';
import UserDrawer from '~/components/Header/UserDrawer';
import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import CartToast from '~/components/menu/CartToast';
import VoucherFlash from '~/components/checkout/VoucherFlash';
import PreorderModal from '~/components/menu/PreorderModal';
import RestaurantInfoModal from '~/components/menu/RestaurantInfoModal';
import ZoneCheckGate from '~/components/onboarding/ZoneCheckGate';
import { useZoneGate } from '~/hooks/useZoneGate';
import { formatSlotLabel, savePreorderSlot } from '~/lib/preorderSlot';
import { useOrderingWindow } from '~/hooks/useOrderingWindow';
import { getCategories, getAllProducts } from '@/lib/api';
import { useMenu } from '~/hooks/useMenu';
import { MenuProduct } from '~/lib/utils';
import LoadingSkeleton from './LoadingSkeleton';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';

export default function HomeScreen() {
  const storeInfo = useStore();
  const { t, language } = useLanguage();
  /*
   * Lines the last menu check took out of the cart — sold out, removed from
   * the menu, from another store. Reported by the cart (see `lastReconcile`),
   * whichever screen's menu load did the removing.
   */
  const { totalItems, totalPrice, lastReconcile, dismissReconcileNotice } = useCart();
  const { orderType, deliveryAddress, setDeliveryAddress, setOrderType } = useAddress();

  /*
   * Loaded once the stored order type is known, with late answers for an
   * order type no longer chosen dropped — see `useMenu`. A switch between
   * collection and delivery keeps the current menu on screen until the newly
   * priced one arrives.
   */
  const { menuData, loading, error } = useMenu();
  const [activeCategory, setActiveCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  /*
   * After a tap on a category the page scrolls smoothly past the sections in
   * between, and the scroll-spy lit each of them up in turn — and near the end
   * of the page, where the last sections cannot reach the top, it settled on
   * the wrong one. The tapped category holds until that scroll has finished.
   */
  const spyPausedUntil = useRef(0);

  // Centralized shell dialogs
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);
  /*
   * The stored pre-order slot, as the cart and checkout read it — so a slot
   * that has passed (dropped there) or one from before a reload shows here too.
   */
  const { slot: preorderSlot } = useOrderingWindow();
  const preorderLabel = preorderSlot ? formatSlotLabel(preorderSlot, { today: t.today, tomorrow: t.tomorrow }, language) : undefined;
  const { showGate, dismissGate } = useZoneGate();

  const productsByCategory = menuData ? getCategories(menuData) : [];
  // The first section until the scroll-spy or a tap picks one.
  const shownCategory = activeCategory || productsByCategory[0]?.id || '';
  const allProducts = menuData ? getAllProducts(menuData) : [];

  const q = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!q) return productsByCategory;
    return productsByCategory
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.products.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData, q]);

  useEffect(() => {
    if (!menuData || q) return;
    const options = { root: null, rootMargin: '-140px 0px -60% 0px', threshold: 0 };
    observerRef.current = new IntersectionObserver((entries) => {
      if (Date.now() < spyPausedUntil.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveCategory(entry.target.id.replace('category-', ''));
      });
    }, options);
    const els = document.querySelectorAll('[id^="category-"]');
    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [menuData, q]);

  const handleCategoryClick = (id: string) => {
    spyPausedUntil.current = Date.now() + 1500;
    // Released as soon as the smooth scroll ends, where the browser says so.
    const release = () => {
      spyPausedUntil.current = Date.now() + 100;
      window.removeEventListener('scrollend', release);
    };
    window.addEventListener('scrollend', release);
    setActiveCategory(id);
  };

  const handleProductClick = (product: MenuProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Cart open with delivery-address gate
  const openCartGuarded = () => {
    if (orderType === 'delivery' && !deliveryAddress && !storeInfo?.tableInfo?.token) {
      setAddressOpen(true);
      return;
    }
    setCartOpen(true);
  };

  if (loading) return <LoadingSkeleton />;

  /*
   * A menu that fails still has a shop around it — header, hours, address,
   * the account drawer — so the page stays and the failure is shown inside
   * it, in German, with a way to try again. The technical message (`error`)
   * is for the console only: guests saw "Unexpected token '<'…" and
   * "Failed to fetch" here before (1.11.2026).
   */
  const menuFailed = !menuData;
  const menuEmpty = !!menuData && productsByCategory.length === 0;
  const noResults = !menuFailed && !menuEmpty && !!q && filteredCategories.length === 0;

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <a
        href='#menu-main'
        className='absolute left-2 top-[-60px] z-[200] rounded-[10px] bg-primary px-4 py-2.5 text-sm font-bold text-selected-text focus:top-2'>
        {t.skipToContent}
      </a>

      <MenuHeader
        query={query}
        onQueryChange={setQuery}
        cartCount={totalItems}
        subtotal={totalPrice}
        onOpenCart={openCartGuarded}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenAddress={() => setAddressOpen(true)}
      />

      <MenuHero />
      <MenuMetaBar
        onRequireAddress={() => setAddressOpen(true)}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenPreorder={() => setPreorderOpen(true)}
        preorderLabel={preorderLabel}
      />
      {productsByCategory.length > 0 && (
        <CategoryNavBar categories={productsByCategory} activeCategory={shownCategory} onCategoryClick={handleCategoryClick} query={query} onQueryChange={setQuery} />
      )}

      <main id='menu-main' className='shell shell-pad pb-28 pt-6 lg:pb-20' role='main'>
        {menuFailed && (
          <div className='flex flex-col items-center px-5 py-20 text-center'>
            <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-surface-1'>
              <AlertCircle className='h-9 w-9 text-warning' strokeWidth={1.8} />
            </div>
            <div className='mt-5 text-lg font-extrabold'>{t.menuUnavailable}</div>
            <button onClick={() => window.location.reload()} className='mt-5 h-[46px] rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
              {t.reload}
            </button>
          </div>
        )}

        {menuEmpty && (
          <div className='flex flex-col items-center px-5 py-20 text-center'>
            <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-surface-1'>
              <UtensilsCrossed className='h-9 w-9 text-fg-faint' />
            </div>
            <div className='mt-5 text-lg font-extrabold'>{t.menuEmpty}</div>
          </div>
        )}

        {/* A refresh failed while an older copy is on screen: keep it, say so. */}
        {error && menuData && (
          <div className='anim-fade mb-6 flex items-center gap-3.5 rounded-2xl border border-warning/35 bg-warning/10 px-4.5 py-4'>
            <AlertCircle className='h-[22px] w-[22px] shrink-0 text-warning' strokeWidth={1.8} />
            <div className='min-w-0 flex-1'>
              <div className='text-[14.5px] font-extrabold text-white'>{t.menuUnavailable}</div>
              <div className='mt-0.5 text-[13px] font-medium text-fg-secondary'>{t.menuLoadFailedSub}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className='h-10 shrink-0 rounded-[11px] bg-primary px-4 text-[13.5px] font-extrabold text-selected-text'>
              {t.reload}
            </button>
          </div>
        )}

        {(lastReconcile?.removed ?? 0) > 0 && (
          <div className='anim-fade mb-5 flex items-center gap-3 rounded-2xl border border-[rgba(255,138,94,0.35)] bg-[rgba(255,138,94,0.1)] px-4 py-3.5'>
            <AlertCircle className='h-5 w-5 shrink-0 text-warning' />
            <div className='min-w-0 flex-1 text-[13.5px] font-semibold text-white'>
              {t.cartItemsRemoved ?? 'Some items are no longer available and were removed from your cart.'}
            </div>
            <button onClick={dismissReconcileNotice} aria-label={t.close} className='shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:text-white'>
              <X className='h-4 w-4' />
            </button>
          </div>
        )}
        {noResults ? (
          <div className='flex flex-col items-center px-5 py-20 text-center'>
            <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-surface-1'>
              <Search className='h-9 w-9 text-fg-faint' />
            </div>
            <div className='mt-5 text-lg font-extrabold'>{t.noResults ?? 'Nothing found'}</div>
            <div className='mt-2 max-w-[320px] text-sm font-medium text-muted-foreground'>
              {(t.noResultsFor ?? 'No dish found for') + ` “${query}”.`}
            </div>
            <button onClick={() => setQuery('')} className='mt-5 h-[46px] rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
              {t.resetSearch ?? 'Reset search'}
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} id={`category-${category.id}`} className='menu-anchor mb-12' aria-labelledby={`heading-${category.id}`}>
              <div className='mb-5 flex items-center gap-3'>
                <span className='h-[26px] w-[5px] shrink-0 rounded-[3px] bg-primary' />
                <h2 id={`heading-${category.id}`} className='m-0 text-2xl font-extrabold tracking-tight md:text-[27px]'>
                  {category.name}
                </h2>
              </div>
              <div
                className='grid grid-cols-1 gap-4 min-[761px]:grid-cols-2 min-[1700px]:grid-cols-3'
                role='list'
                aria-label={`${category.name} products`}>
                {category.products.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <Footer />

      {/* Modals / overlays (centralized) */}
      <ProductModal product={selectedProduct} isOpen={isModalOpen} onClose={handleCloseModal} />
      <Cart isOpen={cartOpen} onOpenChange={setCartOpen} recommendations={allProducts} onOpenProduct={handleProductClick} />
      <OrdersDialog open={ordersOpen} onOpenChange={setOrdersOpen} />
      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => setOrdersOpen(true)} storeSlug={storeInfo?.slug} />
      <DeliveryAddressModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSelect={(addr) => {
          setDeliveryAddress(addr);
          setAddressOpen(false);
        }}
        googleApiKey={storeInfo?.posGoogleApiKey || ''}
        onSuccess={() => {
          if (orderType !== 'delivery') setOrderType('delivery');
        }}
      />

      {/* Mobile floating cart bar */}
      <BottomBar onOpenCart={openCartGuarded} />

      <VoucherFlash />

      {/* Global add-to-cart toast + confetti */}
      <CartToast />

      {/* Delivery zone-check onboarding gate */}
      {showGate && <ZoneCheckGate onDone={dismissGate} />}

      {/* Restaurant info + pre-order modals */}
      <RestaurantInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
      <PreorderModal
        open={preorderOpen}
        onClose={() => setPreorderOpen(false)}
        onConfirm={(slot) => {
          // Persisted so the checkout route picks it up after navigation.
          savePreorderSlot(storeInfo?.slug || 'default', slot);
        }}
      />
    </div>
  );
}
