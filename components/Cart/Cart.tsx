'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Loader2, MessageSquare } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { useCart } from '~/contexts/cart-context';
import { formatPrice, fetchCartRecommendations } from '@/lib/api';
import { useLanguage } from '@/contexts/language-context';
import { cn, getImageURL, MenuProduct } from '~/lib/utils';
import { useStore } from '~/contexts/store-context';
import SmartImage from '~/lib/SmartImage';
import { flyToCart } from '~/lib/flyToCart';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import SwipeToRemove from '~/components/ui/SwipeToRemove';

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
  const { cart, updateQuantity, removeFromCart, totalPrice, totalItems, addToCart, orderMessage, setOrderMessage } = useCart();
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Let the row collapse before it leaves the list, so the ones below it slide
  // up instead of jumping. 320ms is the length of the `anim-remove` keyframes.
  const remove = (itemId: string) => {
    setSwipedId(null);
    setRemovingId(itemId);
    setTimeout(() => {
      removeFromCart(itemId);
      setRemovingId((id) => (id === itemId ? null : id));
    }, 320);
  };
  const { t } = useLanguage();
  const { toCheckout } = useStoreNavigation();

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = onOpenChange ?? setInternalIsOpen;

  // The message row collapses to a preview until the customer opens it.
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgDraft, setMsgDraft] = useState('');
  const [navigating, setNavigating] = useState(false);

  /*
   * Reset the message editor each time the dialog opens. Done as a render-time
   * adjustment rather than an effect: the parent opens the cart programmatically
   * (so `onOpenChange` never fires for it), and an effect keyed on
   * `orderMessage` would also re-run — and collapse the editor — on save.
   */
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setMsgOpen(false);
      setNavigating(false);
    }
  }

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

  // Checkout is its own route; validation lives there (inline, not alerts).
  const proceed = () => {
    setNavigating(true);
    setIsOpen(false);
    toCheckout();
  };

  /** Seed the draft from the saved message at the moment the editor opens. */
  const openEditor = () => {
    setMsgDraft(orderMessage);
    setMsgOpen(true);
  };

  const saveMessage = () => {
    setOrderMessage(msgDraft.trim());
    setMsgOpen(false);
  };

  /** Selected options for a line, rendered as the design's secondary description. */
  const lineSubtitle = (item: (typeof cart)[number]) => {
    const parts: string[] = [];
    Object.entries(item.customizations || {}).forEach(([sectionId, group]) => {
      const section = item.product.addOns?.find((s) => s._id === sectionId);
      if (!section) return;
      Object.entries(group || {}).forEach(([optionId, qty]) => {
        if (qty <= 0) return;
        const opt = section.options?.find((o) => o._id === optionId);
        if (opt) parts.push(qty > 1 ? `${opt.name} × ${qty}` : opt.name);
      });
    });
    // With no options chosen the design shows the product's own description.
    return parts.length > 0 ? parts.join(' · ') : item.product.description || '';
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[58] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[58] flex items-start justify-center overflow-y-auto p-3 pt-6 sm:items-center sm:p-8'>
          <Dialog.Popup className='anim-scalein relative flex max-h-[90vh] w-[600px] max-w-full flex-col overflow-hidden rounded-3xl border border-border-strong bg-card shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <Dialog.Close
              aria-label={t.close}
              className='absolute right-[18px] top-[18px] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
              <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
            </Dialog.Close>

            {/* Items + recommendations */}
            <div className='thinbar min-h-0 flex-1 overflow-y-auto px-7 pb-3 pt-7'>
              <Dialog.Title className='mb-[22px] font-display text-[30px] font-extrabold tracking-[-0.01em]'>{t.yourOrder}</Dialog.Title>

              <div role='list'>
                {cart.map((item) => {
                  const subtitle = lineSubtitle(item);
                  return (
                    <div key={item.id} className='-mx-4'>
                      <SwipeToRemove
                        open={swipedId === item.id}
                        onOpenChange={(next) => setSwipedId(next ? item.id : null)}
                        onRemove={() => remove(item.id)}
                        removeLabel={t.remove}
                        allowMouse
                        surfaceClassName='bg-card'>
                        <div
                          role='listitem'
                          className={cn(
                            'flex items-start gap-4 rounded-[14px] border-b border-white/[0.06] p-4 transition-colors duration-150 hover:bg-white/[0.04]',
                            removingId === item.id && 'anim-remove',
                          )}>
                          <div className='relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-xl bg-white'>
                            {item.product.images?.length ? (
                              <SmartImage fallbackSrc={logoURL} src={getImageURL(item.product.images[0])} alt={item.product.name} fill className='object-cover' sizes='58px' />
                            ) : null}
                          </div>

                          <div className='min-w-0 flex-1'>
                            <div className='text-base font-bold leading-[1.3]'>{item.product.name}</div>
                            {subtitle && <div className='mt-[3px] line-clamp-2 text-[13px] font-medium leading-[1.5] text-muted-foreground'>{subtitle}</div>}
                            <div className='mt-2.5 text-[15px] font-extrabold text-white'>{formatPrice(item.product.currentPrice * item.quantity)}</div>
                            {item.notes && <div className='mt-[5px] text-xs font-medium italic text-muted-foreground'>„{item.notes}“</div>}
                          </div>

                          {/* Stepper */}
                          <div className='relative flex shrink-0 items-center gap-0.5 rounded-xl bg-surface-3 p-1'>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label='less'
                              className='wztouch flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[18px] font-bold leading-none text-white transition active:scale-[0.82]'>
                              −
                            </button>
                            <span className='min-w-5 text-center text-sm font-extrabold'>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label='more'
                              className='wztouch flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-base font-bold leading-none text-white transition active:scale-[0.82]'>
                              +
                            </button>
                          </div>
                        </div>
                      </SwipeToRemove>
                    </div>
                  );
                })}
              </div>

              {/* Recommendations */}
              {recs.length > 0 && (
                <>
                  <h3 className='mt-[26px] font-display text-[22px] font-extrabold tracking-[-0.01em]'>{t.recommendedForYou}</h3>
                  <div className='noscroll mt-3.5 flex gap-3.5 overflow-x-auto pb-1'>
                    {recs.map((r) => {
                      const img = r.images?.length ? getImageURL(r.images[0]) : logoURL;
                      const requiresModal = r.haveCustomizations && (r.addOns || []).some((g) => (g.minimumQuantity ?? 0) > 0);
                      return (
                        <div key={r.id} className='w-[170px] shrink-0'>
                          <div className='relative'>
                            <button type='button' onClick={() => onOpenProduct?.(r)} aria-label={r.name} className='group relative block h-28 w-[170px] overflow-hidden rounded-[14px] bg-white'>
                              <SmartImage
                                fallbackSrc={logoURL}
                                src={img}
                                alt={r.name}
                                fill
                                sizes='170px'
                                className='object-contain transition-transform duration-[350ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] group-hover:scale-[1.14]'
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                // Products with a required option group must be
                                // configured in the modal, not quick-added.
                                if (requiresModal) {
                                  onOpenProduct?.(r);
                                  return;
                                }
                                flyToCart(e.currentTarget, img || '');
                                addToCart(r, 1, {});
                              }}
                              aria-label={t.add}
                              className='absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-selected-text shadow-[0_3px_9px_rgba(0,0,0,0.5)] transition active:scale-[0.85]'>
                              <Plus className='h-4 w-4' strokeWidth={2.6} />
                            </button>
                          </div>
                          <div className='mt-[9px] truncate text-sm font-bold'>{r.name}</div>
                          <div className='mt-[3px] text-sm font-extrabold text-warning'>{formatPrice(r.currentPrice)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Message for the restaurant */}
            <div className='shrink-0 border-t border-border px-7 py-4'>
              {msgOpen ? (
                <>
                  <div className='mb-2.5 flex items-center gap-2.5'>
                    <MessageSquare className='h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.7} />
                    <span className='flex-1 text-sm font-bold'>{t.messageForRestaurant}</span>
                  </div>
                  <textarea
                    value={msgDraft}
                    onChange={(e) => setMsgDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    aria-label={t.messageForRestaurant}
                    placeholder={t.messageForRestaurantPlaceholder}
                    className='w-full resize-none rounded-[14px] border-[1.5px] border-white/[0.12] bg-surface-3 px-[15px] py-[13px] text-sm font-medium leading-[1.5] text-white'
                  />
                  <div className='mt-2.5 flex justify-end'>
                    <button onClick={saveMessage} className='h-10 rounded-xl bg-primary px-[18px] text-[13.5px] font-extrabold text-selected-text transition active:scale-[0.96]'>
                      {t.save}
                    </button>
                  </div>
                </>
              ) : (
                <div
                  role='button'
                  tabIndex={0}
                  onClick={openEditor}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openEditor()}
                  className='-mx-3 flex cursor-pointer items-center gap-3.5 rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-white/[0.04]'>
                  <MessageSquare className='h-[22px] w-[22px] shrink-0 text-muted-foreground' strokeWidth={1.7} />
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-bold'>{t.messageForRestaurant}</div>
                    <div className={cn('mt-0.5 truncate text-[12.5px] font-medium', orderMessage ? 'text-white' : 'text-muted-foreground')}>{orderMessage || t.messageForRestaurantHint}</div>
                  </div>
                  <span className='flex h-[38px] shrink-0 items-center rounded-[11px] bg-surface-3 px-4 text-[13px] font-bold text-white transition-colors duration-150 hover:bg-control'>
                    {orderMessage ? t.edit : t.add}
                  </span>
                </div>
              )}
            </div>

            {/* Checkout */}
            <div className='shrink-0 px-7 pb-[22px] pt-4'>
              <button
                onClick={proceed}
                disabled={navigating}
                data-cart-footer='1'
                className='flex h-14 w-full items-center gap-3.5 rounded-2xl bg-primary px-2 text-base font-extrabold text-selected-text transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_12px_26px_-8px_rgba(0,0,0,0.55)] active:scale-[0.99]'>
                {navigating ? (
                  <Loader2 className='mx-auto h-[22px] w-[22px] animate-spin' />
                ) : (
                  <>
                    <span className='flex h-8 min-w-[30px] items-center justify-center rounded-[10px] bg-black px-[9px] text-sm font-extrabold text-white'>{totalItems}</span>
                    <span className='flex-1 text-left'>{t.goToCheckout}</span>
                    <span className='pr-3'>{formatPrice(totalPrice)}</span>
                  </>
                )}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
