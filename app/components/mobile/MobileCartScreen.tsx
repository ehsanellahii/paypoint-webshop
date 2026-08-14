"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Minus,
  Plus,
  Plus as PlusIcon,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import MobileShell from "~/components/mobile/MobileShell";
import SwipeToRemove from '~/components/ui/SwipeToRemove';
import SmartImage from '~/lib/SmartImage';
import { fetchCartRecommendations, formatPrice } from "~/lib/api";
import { cn, getImageURL, getPostalRateInfo, type MenuProduct } from "~/lib/utils";
import { useCart } from "~/contexts/cart-context";
import { useAddress } from "~/contexts/address-context";
import { useStore } from "~/contexts/store-context";
import { useLanguage } from "~/contexts/language-context";
import { useStoreNavigation } from "~/hooks/useStoreNavigation";

/**
 * Cart as a full screen (mobile). The desktop equivalent is a dialog; both read
 * the same cart context, including the order message shared with checkout.
 */
export default function MobileCartScreen() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    totalItems,
    totalPrice,
    discountAmount,
    appliedVoucher,
    orderMessage,
    setOrderMessage,
  } = useCart();
  const { orderType, deliveryAddress } = useAddress();
  const { toMenu, toCheckout, toProduct, back } = useStoreNavigation();

  // Only one row may sit open at a time, and a row being removed is held for
  // the length of its collapse animation before it leaves the cart.
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  /*
   * Co-purchase recommendations, the same call the desktop cart makes. The
   * design gives them their own grid under the items; without it the mobile
   * cart just ended at the note.
   */
  const [recs, setRecs] = useState<MenuProduct[]>([]);
  const cartKey = cart.map((c) => c.product.id).join(',');
  useEffect(() => {
    if (!storeInfo?.adminId || !storeInfo?.storeId) return;
    let cancelled = false;
    fetchCartRecommendations(storeInfo.adminId, storeInfo.storeId, cartKey ? cartKey.split(',') : [], 4).then((res) => {
      if (!cancelled) setRecs(res.filter((p) => !cart.some((c) => c.product.id === p.id)).slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, storeInfo?.adminId, storeInfo?.storeId]);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const isDelivery = orderType === "delivery" && !storeInfo?.tableInfo?.token;
  const rate = getPostalRateInfo(
    Number(deliveryAddress?.postalCode || 0),
    storeInfo?.postalRates || [],
  );
  const deliveryFee = isDelivery ? (rate.deliveryCharges ?? 0) : 0;
  const total = totalPrice - discountAmount + deliveryFee;
  const logoURL = storeInfo?.settings?.logo || "";

  const remove = (itemId: string) => {
    setSwipedId(null);
    setRemovingId(itemId);
    // Let the row collapse before it disappears from the list.
    setTimeout(() => {
      removeFromCart(itemId);
      setRemovingId((id) => (id === itemId ? null : id));
    }, 320);
  };

  const openNote = () => {
    setNoteDraft(orderMessage);
    setNoteOpen(true);
  };
  const saveNote = () => {
    setOrderMessage(noteDraft.trim());
    setNoteOpen(false);
  };

  return (
    <MobileShell className="flex flex-col">
      {/* Header */}
      <div className="relative mt-3 flex h-[54px] flex-none items-center justify-center px-[18px]">
        <button
          onClick={back}
          aria-label={t.close}
          className="absolute left-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-card text-white transition active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <h1 className="text-[17px] font-extrabold text-white">{t.yourOrder}</h1>
      </div>

      <div className="noscroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-[140px] pt-1.5">
        {cart.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-5 text-center">
            <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card">
              <ShoppingBag
                className="h-8 w-8 text-muted-foreground"
                strokeWidth={1.6}
              />
            </div>
            <div className="mt-[18px] text-[17px] font-extrabold text-white">
              {t.cartEmpty}
            </div>
            <div className="mt-2 text-[13.5px] font-medium leading-relaxed text-muted-foreground">
              {t.cartEmptySub}
            </div>
            <button
              onClick={toMenu}
              className="mt-5 h-12 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text"
            >
              {t.continueToMenu}
            </button>
          </div>
        ) : (
          <>
            {/* Order message, first under the header as the design has it —
                the same value checkout submits. */}
            <div>
              {noteOpen ? (
                <div className="rounded-2xl bg-card p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {t.messageForRestaurant}
                    </span>
                    <button
                      onClick={() => setNoteOpen(false)}
                      aria-label={t.close}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-3 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    autoFocus
                    rows={3}
                    aria-label={t.messageForRestaurant}
                    placeholder={t.messageForRestaurantPlaceholder}
                    className="w-full resize-none rounded-xl bg-surface-3 px-3.5 py-3 text-sm font-medium leading-relaxed text-white"
                  />
                  <button
                    onClick={saveNote}
                    className="mt-3 h-[42px] w-full rounded-xl bg-primary text-[13.5px] font-extrabold text-selected-text"
                  >
                    {t.save}
                  </button>
                </div>
              ) : (
                <button
                  onClick={openNote}
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">
                      {t.messageForRestaurant}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground">
                      {orderMessage || t.messageForRestaurantHint}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-[10px] bg-surface-3 px-3 py-2 text-[12.5px] font-bold text-white">
                    {orderMessage ? t.edit : t.add}
                  </span>
                </button>
              )}
            </div>

            {/* The design pairs the section heading with the add link on one row. */}
            <div className="mt-6 flex items-center justify-between">
              <span className="text-[18px] font-extrabold tracking-[-0.01em]">{t.orderedItems ?? 'Ordered items'}</span>
              <button onClick={toMenu} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#1c9bef] transition active:scale-[0.97]">
                <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.6} />
                {t.addMore ?? t.addMoreItems}
              </button>
            </div>

            {cart.map((item) => {
              const img = item.product.images?.length
                ? getImageURL(item.product.images[0])
                : logoURL;
              const extras = Object.entries(item.customizations || {})
                .flatMap(([sectionId, group]) => {
                  const section = item.product.addOns?.find(
                    (s) => s._id === sectionId,
                  );
                  if (!section) return [];
                  return Object.entries(group || {})
                    .filter(([, q]) => q > 0)
                    .map(([optionId, q]) => {
                      const opt = section.options?.find(
                        (o) => o._id === optionId,
                      );
                      return opt
                        ? q > 1
                          ? `${opt.name} × ${q}`
                          : opt.name
                        : "";
                    });
                })
                .filter(Boolean)
                .join(" · ");

              return (
                <SwipeToRemove
                  key={item.id}
                  open={swipedId === item.id}
                  onOpenChange={(next) => setSwipedId(next ? item.id : null)}
                  onRemove={() => remove(item.id)}
                  removeLabel={t.remove}
                >
                  <div
                    className={cn(
                      "dzcartrow flex items-center gap-3 border-b border-border py-3",
                      removingId === item.id && "anim-remove",
                    )}
                  >
                    {img ? (
                      <SmartImage
                        src={img}
                        alt={item.product.name}
                        sizes="44px"
                        className="object-cover"
                        wrapperClassName="h-11 w-11 shrink-0 rounded-[11px]"
                      />
                    ) : (
                      <div className="h-11 w-11 shrink-0 rounded-[11px] bg-card" />
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toProduct(String(item.product.id))}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        toProduct(String(item.product.id))
                      }
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-bold leading-[1.3] text-white">
                        {item.product.name}
                      </div>
                      {extras && (
                        <div className="mt-0.5 text-[11.5px] font-medium leading-[1.4] text-muted-foreground">
                          {extras}
                        </div>
                      )}
                      <div className="mt-[3px] text-[12.5px] font-extrabold text-white">
                        {formatPrice(item.product.currentPrice * item.quantity)}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 rounded-[13px] bg-card p-[3px]">
                      <button
                        onClick={() =>
                          item.quantity <= 1
                            ? remove(item.id)
                            : updateQuantity(item.id, item.quantity - 1)
                        }
                        aria-label={item.quantity <= 1 ? t.remove : "less"}
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white transition active:scale-[0.85]"
                      >
                        {item.quantity <= 1 ? (
                          <Trash2
                            className="h-4 w-4 text-destructive"
                            strokeWidth={2}
                          />
                        ) : (
                          <Minus className="h-4 w-4" strokeWidth={2.4} />
                        )}
                      </button>
                      <span className="min-w-5 text-center text-sm font-extrabold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        aria-label="more"
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] text-white transition active:scale-[0.85]"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                </SwipeToRemove>
              );
            })}


            {/* Recommendations — two-up cards, per the design. */}
            {recs.length > 0 && (
              <>
                <div className="mt-7 text-[17px] font-extrabold tracking-[-0.01em]">{t.recommendedForYou}</div>
                <div className="mt-3.5 grid grid-cols-2 gap-3">
                  {recs.map((p) => {
                    const img = p.images?.length ? getImageURL(p.images[0]) : '';
                    return (
                      <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-1">
                        <div className="relative">
                          <button
                            onClick={() => toProduct(String(p.id))}
                            aria-label={p.name}
                            className="block h-[108px] w-full bg-card bg-cover bg-center"
                            style={img ? { backgroundImage: `url("${img}")` } : undefined}
                          />
                          {/* The design notches this button into the corner rather than floating it. */}
                          <button
                            onClick={() => addToCart(p, 1, {})}
                            aria-label={t.addToCart ?? 'Add'}
                            className="absolute -right-px -top-px flex h-[35px] w-[38px] items-start justify-end rounded-bl-[18px] rounded-tr-[17px] bg-surface-1 pr-[7px] pt-1.5 text-white transition active:scale-90"
                          >
                            <PlusIcon className="h-[15px] w-[15px]" strokeWidth={2.6} />
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <div className="text-sm font-extrabold">{formatPrice(p.currentPrice)}</div>
                          <div className="mt-1 line-clamp-2 text-[13px] font-medium leading-[1.3]">{p.name}</div>
                          <button
                            onClick={() => toProduct(String(p.id))}
                            className="mt-2.5 self-start text-[12.5px] font-semibold text-muted-foreground transition hover:text-white"
                          >
                            {t.productInfo ?? 'Product info'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Totals + checkout */}
      {cart.length > 0 && (
        <div
          className="absolute inset-x-0 bottom-0 z-[6] bg-background px-[18px] pt-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          }}
        >
          <div className="mb-3 flex flex-col gap-1.5 text-[13px] font-medium text-fg-secondary">
            <div className="flex justify-between">
              <span>{t.subtotal}</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span>{t.deliveryCharges}</span>
                <span
                  className={deliveryFee === 0 ? "font-bold text-success" : ""}
                >
                  {deliveryFee === 0 ? t.free : formatPrice(deliveryFee)}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between font-semibold text-success">
                <span>
                  {t.voucher} {appliedVoucher?.code ?? ""}
                </span>
                <span>−{formatPrice(discountAmount)}</span>
              </div>
            )}
          </div>

          {/*
            A bar across the bottom edge, not a button inside the sheet: the
            design rounds only its top corners and lets it meet the screen edge,
            with the count in a filled disc rather than a pill.
          */}
          <button
            onClick={toCheckout}
            className="-mx-[18px] flex w-[calc(100%+36px)] items-center gap-3.5 rounded-t-[18px] bg-primary px-5 text-selected-text shadow-[0_-8px_24px_rgba(0,0,0,0.45)] transition active:scale-[0.99]"
            style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-selected-text text-sm font-extrabold text-white">
              {totalItems}
            </span>
            <span className="flex-1 text-left text-[16.5px] font-extrabold tracking-[-0.01em]">
              {t.goToCheckout}
            </span>
            <span className="shrink-0 whitespace-nowrap text-[16.5px] font-extrabold">
              {formatPrice(total)}
            </span>
          </button>
        </div>
      )}
    </MobileShell>
  );
}
