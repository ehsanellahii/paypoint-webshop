'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useCart } from '~/contexts/cart-context';
import { formatPrice as apiFormatPrice, fetchCartRecommendations } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getImageURL, getPostalRateInfo, MenuProduct } from '~/lib/utils';
import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import SmartImage from '~/lib/SmartImage';
import { flyToCart } from '~/lib/flyToCart';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

interface CartProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openOrdersDialog?: () => void;
  /** Fallback pool used when the server has no pairings yet. */
  recommendations?: MenuProduct[];
  /** Opens the product modal — used for recommendations that require options. */
  onOpenProduct?: (product: MenuProduct) => void;
}

export default function Cart({ isOpen: controlledIsOpen, onOpenChange, recommendations = [], onOpenProduct }: CartProps = {}) {
  const storeInfo = useStore();
  const logoURL = storeInfo?.settings?.logo || '';
  const { cart, updateQuantity, totalPrice, totalItems, discountAmount, addToCart } = useCart();
  const { orderType, deliveryAddress } = useAddress();
  const { t } = useLanguage();
  const { toCheckout } = useStoreNavigation();

  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;
  const postalRateInfo = getPostalRateInfo(Number(deliveryAddress?.postalCode || 0), storeInfo?.postalRates || []);
  const isDeliveryAvailable = postalRateInfo.isAvailable;
  const deliveryCharges = postalRateInfo.deliveryCharges;

  const handleOpenChange = (open: boolean) => setIsOpen(open);

  // Server-backed recommendations (co-purchase pairings), refreshed when the
  // cart opens or its contents change. Falls back to a menu slice when the
  // store has no pairing data yet.
  const [serverRecs, setServerRecs] = useState<MenuProduct[]>([]);
  const cartKey = cart.map((c) => c.product.id).join(',');

  useEffect(() => {
    if (!isOpen || !storeInfo?.adminId || !storeInfo?.storeId) return;
    let cancelled = false;

    fetchCartRecommendations(storeInfo.adminId, storeInfo.storeId, cartKey ? cartKey.split(',') : [], 8).then((res) => {
      if (!cancelled) setServerRecs(res);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, cartKey, storeInfo?.adminId, storeInfo?.storeId]);

  const fallbackRecs = recommendations.filter((p) => !cart.some((c) => c.product.id === p.id)).slice(0, 8);
  const recs = (serverRecs.length > 0 ? serverRecs : fallbackRecs).filter((p) => !cart.some((c) => c.product.id === p.id)).slice(0, 8);
  const subtotalAfterDiscount = totalPrice - discountAmount;
  const grandTotal = deliveryCharges != null && isDeliveryAvailable && orderType === 'delivery' ? subtotalAfterDiscount + deliveryCharges : subtotalAfterDiscount;

  // Checkout is its own route now; validation lives there (inline, not alerts).
  const proceed = () => {
    setIsOpen(false);
    toCheckout();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='flex h-[90dvh] max-h-[90dvh] w-[calc(100vw-2rem)] max-w-[600px] flex-col overflow-hidden rounded-3xl border border-border bg-card p-0'>
        <>
          <button
              onClick={() => setIsOpen(false)}
              aria-label={t.close}
              className='absolute right-[18px] top-[18px] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
              <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
            </button>

            {/* Items + recommendations */}
            <div className='min-h-0 flex-1 overflow-y-auto scrollbar-hide px-7 pb-3 pt-7'>
              <DialogTitle className='mb-5 font-display text-3xl font-extrabold tracking-tight'>{t.order}</DialogTitle>

              <div role='list'>
                {cart.map((item) => (
                  <div key={item.id} className='flex items-start gap-4 border-b border-border py-4' role='listitem'>
                    <div className='relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-white'>
                      {item.product.images?.length ? (
                        <SmartImage fallbackSrc={logoURL} src={getImageURL(item.product.images[0])} alt={item.product.name} fill className='object-cover' sizes='58px' />
                      ) : null}
                    </div>

                    <div className='min-w-0 flex-1'>
                      <div className='text-base font-bold leading-tight'>{item.product.name}</div>

                      {Object.keys(item.customizations || {}).length > 0 && (
                        <div className='mt-1 space-y-0.5 text-[13px] text-muted-foreground'>
                          {Object.entries(item.customizations).map(([sectionId, group]) => {
                            const section = item.product.addOns.find((s) => s._id === sectionId);
                            if (!section) return null;
                            return (
                              <div key={sectionId}>
                                {Object.entries(group).map(([optionId, qty]) => {
                                  if (qty <= 0) return null;
                                  const opt = section.options.find((o) => o._id === optionId);
                                  if (!opt) return null;
                                  return (
                                    <p key={optionId}>
                                      {opt.name}
                                      {qty > 1 && ` × ${qty}`}
                                    </p>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className='mt-2.5 text-[15px] font-extrabold'>{apiFormatPrice(item.product.currentPrice * item.quantity)}</div>
                      {item.notes && <div className='mt-1 text-xs font-medium italic text-muted-foreground'>“{item.notes}”</div>}
                    </div>

                    {/* Stepper */}
                    <div className='flex shrink-0 items-center gap-0.5 rounded-xl bg-surface-3 p-1'>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label='less' className='flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-white transition active:scale-[0.82]'>
                        <Minus className='h-4 w-4' strokeWidth={2.4} />
                      </button>
                      <span className='min-w-5 text-center text-sm font-extrabold'>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label='more' className='flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-white transition active:scale-[0.82]'>
                        <Plus className='h-4 w-4' strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {recs.length > 0 && (
                <>
                  <h3 className='mt-6 font-display text-[22px] font-extrabold tracking-tight'>{t.recommendedForYou ?? 'Recommended for you'}</h3>
                  <div className='noscroll mt-3.5 flex gap-3.5 overflow-x-auto pb-1'>
                    {recs.map((r) => {
                      const img = r.images?.length ? getImageURL(r.images[0]) : logoURL;
                      return (
                        <div key={r.id} className='w-[170px] shrink-0'>
                          <div className='relative'>
                            <div className='relative h-28 w-[170px] overflow-hidden rounded-[14px] bg-white'>
                              <SmartImage fallbackSrc={logoURL} src={img} alt={r.name} fill className='object-contain' sizes='170px' />
                            </div>
                            <button
                              onClick={(e) => {
                                // Products with a required option group must be
                                // configured in the modal, not quick-added.
                                const requiresModal = r.haveCustomizations && (r.addOns || []).some((g) => (g.minimumQuantity ?? 0) > 0);
                                if (requiresModal) {
                                  onOpenProduct?.(r);
                                  return;
                                }
                                flyToCart(e.currentTarget, img || '');
                                addToCart(r, 1, {});
                              }}
                              aria-label='Add'
                              className='absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-selected-text shadow-[0_3px_9px_rgba(0,0,0,0.5)] transition active:scale-[0.85]'>
                              <Plus className='h-4 w-4' strokeWidth={2.6} />
                            </button>
                          </div>
                          <div className='mt-2 truncate text-sm font-bold'>{r.name}</div>
                          <div className='mt-0.5 text-sm font-extrabold text-brand-red'>{apiFormatPrice(r.currentPrice)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          {/* Totals + checkout */}
          <div className='shrink-0 space-y-3 border-t border-border px-7 pb-6 pt-4'>
            {orderType === 'delivery' && !storeInfo?.tableInfo?.token && (
              <div className='flex justify-between text-sm font-semibold text-muted-foreground'>
                <span>{t.deliveryCharges}</span>
                <span>{deliveryCharges != null && isDeliveryAvailable ? apiFormatPrice(deliveryCharges) : t.notAvailable}</span>
              </div>
            )}
            <div className='flex items-baseline justify-between text-lg font-extrabold'>
              <span>{t.totalIncludingVAT}</span>
              <span>{apiFormatPrice(grandTotal)}</span>
            </div>

            <button onClick={proceed} className='flex h-14 w-full items-center gap-3.5 rounded-2xl bg-primary px-2.5 text-selected-text transition active:scale-[0.99]'>
              <span className='flex h-8 min-w-[30px] items-center justify-center rounded-[10px] bg-black px-2.5 text-sm font-extrabold text-white'>{totalItems}</span>
              <span className='flex-1 text-left text-base font-extrabold'>{t.checkout}</span>
              <span className='pr-2 text-base font-extrabold'>{apiFormatPrice(grandTotal)}</span>
            </button>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
