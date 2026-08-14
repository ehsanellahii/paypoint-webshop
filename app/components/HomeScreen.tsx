'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, AlertCircle, X } from 'lucide-react';
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
import PreorderModal, { type PreorderSlot } from '~/components/menu/PreorderModal';
import RestaurantInfoModal from '~/components/menu/RestaurantInfoModal';
import ZoneCheckGate from '~/components/onboarding/ZoneCheckGate';
import { useZoneGate } from '~/hooks/useZoneGate';
import { savePreorderSlot } from '~/lib/preorderSlot';
import { fetchMenuData, getCategories, getAllProducts } from '@/lib/api';
import { IMenuData, MenuProduct } from '~/lib/utils';
import LoadingSkeleton from './LoadingSkeleton';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';

export default function HomeScreen() {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const { totalItems, totalPrice, pruneUnavailable } = useCart();
  const [prunedCount, setPrunedCount] = useState(0);
  const { orderType, deliveryAddress, setDeliveryAddress, setOrderType } = useAddress();

  const [menuData, setMenuData] = useState<IMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Centralized shell dialogs
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);
  const [scheduledSlot, setScheduledSlot] = useState<PreorderSlot | null>(null);
  const { showGate, dismissGate } = useZoneGate();

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        const data = await fetchMenuData(storeInfo?.adminId, storeInfo?.storeId);
        setMenuData(data);
        const categories = getCategories(data);
        if (categories.length > 0) setActiveCategory(categories[0].id);
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load menu data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [storeInfo?.adminId, storeInfo?.storeId]);

  const productsByCategory = menuData ? getCategories(menuData) : [];
  const allProducts = menuData ? getAllProducts(menuData) : [];

  // Reconcile a persisted cart against the live menu. Items that were removed,
  // deactivated, or left over from another store would otherwise fail the whole
  // order server-side with "Invalid product" at checkout.
  useEffect(() => {
    if (!menuData) return;
    const validIds = getAllProducts(menuData).map((p) => String(p.id ?? p._id));
    const removed = pruneUnavailable(validIds);
    if (removed > 0) setPrunedCount(removed);
  }, [menuData, pruneUnavailable]);

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
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveCategory(entry.target.id.replace('category-', ''));
      });
    }, options);
    const els = document.querySelectorAll('[id^="category-"]');
    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [menuData, q]);

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
   * A menu that fails outright still has a shop around it — header, hours,
   * address, the account drawer — so the failure is a banner over whatever did
   * load rather than a page that replaces all of it. Only a total failure with
   * nothing to show falls back to the full-page state.
   */
  if (!menuData) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='text-center'>
          <p className='mb-4 text-brand-red'>{error || t.menuLoadFailed}</p>
          <button onClick={() => window.location.reload()} className='rounded-lg bg-primary px-6 py-2 font-medium text-selected-text'>
            {t.retry ?? 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const noResults = !!q && filteredCategories.length === 0;

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
        preorderLabel={scheduledSlot?.label}
      />
      <CategoryNavBar categories={productsByCategory} activeCategory={activeCategory} onCategoryClick={setActiveCategory} query={query} onQueryChange={setQuery} />

      <main id='menu-main' className='shell shell-pad pb-28 pt-6 lg:pb-20' role='main'>
        {error && (
          <div className='anim-fade mb-6 flex items-center gap-3.5 rounded-2xl border border-warning/35 bg-warning/10 px-4.5 py-4'>
            <AlertCircle className='h-[22px] w-[22px] shrink-0 text-warning' strokeWidth={1.8} />
            <div className='min-w-0 flex-1'>
              <div className='text-[14.5px] font-extrabold text-white'>{t.menuLoadFailed}</div>
              <div className='mt-0.5 text-[13px] font-medium text-fg-secondary'>{t.menuLoadFailedSub}</div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className='h-10 shrink-0 rounded-[11px] bg-primary px-4 text-[13.5px] font-extrabold text-selected-text'>
              {t.reload}
            </button>
          </div>
        )}

        {prunedCount > 0 && (
          <div className='anim-fade mb-5 flex items-center gap-3 rounded-2xl border border-[rgba(255,138,94,0.35)] bg-[rgba(255,138,94,0.1)] px-4 py-3.5'>
            <AlertCircle className='h-5 w-5 shrink-0 text-warning' />
            <div className='min-w-0 flex-1 text-[13.5px] font-semibold text-white'>
              {t.cartItemsRemoved ?? 'Some items are no longer available and were removed from your cart.'}
            </div>
            <button onClick={() => setPrunedCount(0)} aria-label={t.close} className='shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:text-white'>
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
          setScheduledSlot(slot);
          // Persisted so the checkout route picks it up after navigation.
          savePreorderSlot(storeInfo?.slug || 'default', slot);
        }}
      />
    </div>
  );
}
