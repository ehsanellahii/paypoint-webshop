'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Minus, Pencil, Plus, X } from 'lucide-react';

import MobileShell from '~/components/mobile/MobileShell';
import { formatPrice, getAllProducts } from '~/lib/api';
import { AddOnGroup, cn, getImageURL, MenuProduct } from '~/lib/utils';
import SmartImage from '~/lib/SmartImage';
import { useMenu } from '~/hooks/useMenu';
import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { isSoldOut } from '~/lib/productConfig';
import { ITEM_NOTE_MAX } from '~/lib/itemNote';

type Customization = Record<string, Record<string, number>>;

/**
 * Product detail as a full screen (mobile). The desktop equivalent is a modal;
 * this shares the option model and validation with it, but not the layout.
 */
export default function MobileProductScreen({ productId }: { productId: string }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { addToCart } = useCart();
  const { back, toMenu } = useStoreNavigation();

  /*
   * The menu the menu screen already loaded, priced for the current order
   * type — opening a product used to download the whole menu again.
   */
  const { menuData, loading, error } = useMenu();
  const product = useMemo<MenuProduct | null>(
    () => (menuData ? (getAllProducts(menuData).find((p) => String(p.id) === productId || String(p._id) === productId) ?? null) : null),
    [menuData, productId],
  );
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Customization>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // A single-SKU product has no size to choose; the row below stays hidden.
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const skus = product?.skus ?? [];
  const selectedSku =
    skus.find((sku) => sku._id === selectedSkuId) ?? skus.find((sku) => sku.available) ?? skus[0];

  const groupTotal = (sectionId: string) => Object.values(selected[sectionId] ?? {}).reduce((a, b) => a + b, 0);

  const setOption = (section: AddOnGroup, optionId: string, next: number) => {
    setSelected((prev) => {
      const group = prev[section._id] ?? {};
      next = Math.max(0, Math.floor(next));

      if (!section.isMultipleSelectionAllowed) {
        if (next <= 0) {
          const { [section._id]: _omit, ...rest } = prev;
          return rest;
        }
        return { ...prev, [section._id]: { [optionId]: 1 } };
      }

      const total = Object.values(group).reduce((a, b) => a + b, 0);
      if (section.maximumQuantity > 0 && total + (next - (group[optionId] ?? 0)) > section.maximumQuantity) return prev;

      const nextGroup = { ...group };
      if (next === 0) delete nextGroup[optionId];
      else nextGroup[optionId] = next;
      if (!Object.keys(nextGroup).length) {
        const { [section._id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [section._id]: nextGroup };
    });
    setErrors((prev) => {
      if (!prev[section._id]) return prev;
      const copy = { ...prev };
      delete copy[section._id];
      return copy;
    });
  };

  const total = useMemo(() => {
    if (!product) return 0;
    let sum = selectedSku?.price ?? product.currentPrice;
    (product.addOns ?? []).forEach((section) => {
      Object.entries(selected[section._id] ?? {}).forEach(([optionId, qty]) => {
        const opt = section.options.find((o) => o._id === optionId);
        if (opt && qty > 0) sum += opt.price * qty;
      });
    });
    return sum * quantity;
  }, [product, selected, quantity, selectedSku]);

  // Nothing to add when every size is off, or the one shown is (sold out).
  const unavailable = !!product && (isSoldOut(product) || selectedSku?.available === false);

  const submit = () => {
    if (!product || unavailable) return;
    const next: Record<string, string> = {};
    for (const section of product.addOns ?? []) {
      const min = section.minimumQuantity ?? 0;
      if (min > 0 && groupTotal(section._id) < min) next[section._id] = `${section.name}: ${t.chooseMin} ${min}`;
    }
    if (Object.keys(next).length) {
      setErrors(next);
      document.getElementById(`opt-${Object.keys(next)[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    addToCart(product, quantity, selected, notes, selectedSku);
    back();
  };

  if (loading) {
    return (
      <MobileShell>
        <div className='flex h-full items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      </MobileShell>
    );
  }

  if (!product) {
    // The menu did not load at all: say so, never "nothing found".
    const failed = !menuData && !!error;
    return (
      <MobileShell>
        <div className='flex h-full flex-col items-center justify-center gap-4 px-6 text-center'>
          {failed && (
            <div className='flex h-[78px] w-[78px] items-center justify-center rounded-full bg-card'>
              <AlertCircle className='h-9 w-9 text-warning' strokeWidth={1.8} />
            </div>
          )}
          <div className='text-lg font-extrabold'>{failed ? t.menuUnavailable : t.noResults}</div>
          <button
            onClick={failed ? () => window.location.reload() : toMenu}
            className='h-12 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
            {failed ? t.reload : t.continueToMenu}
          </button>
        </div>
      </MobileShell>
    );
  }

  const img = product.images?.length ? getImageURL(product.images[0]) : storeInfo?.settings?.logo || '';

  return (
    <MobileShell className='flex flex-col'>
      <button
        onClick={back}
        aria-label={t.close}
        className='absolute right-4 top-4 z-[7] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-card text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition active:scale-90'>
        <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
      </button>

      <div className='noscroll min-h-0 flex-1 overflow-y-auto bg-background'>
        <div className='relative h-[210px] overflow-hidden'>
          {img ? (
            <SmartImage src={img} alt={product.name} sizes='(max-width: 440px) 100vw, 440px' className='object-cover' wrapperClassName='absolute inset-0' />
          ) : (
            <div className='absolute inset-0 bg-card' />
          )}
        </div>

        {/* The sheet overlaps the photo, so the title sits over its lower edge. */}
        <div className='relative z-[2] -mt-[30px] px-5 pb-[120px] pt-1'>
          <h1 className='m-0 mt-[30px] text-[26px] font-black leading-[1.15] tracking-[-0.01em] text-white'>{product.name}</h1>
          <div className='mt-2 text-[19px] font-extrabold text-[#82c2e5]'>{formatPrice(selectedSku?.price ?? product.currentPrice)}</div>
          {product.description && <div className='mt-2.5 text-sm font-medium leading-[1.55] text-fg-tertiary'>{product.description}</div>}

          {/* Size first: it sets the price the options are added to. */}
          {skus.length > 1 && (
            <div className='mt-[26px]'>
              <p className='text-[16px] font-extrabold'>{t.sizeLabel}</p>
              <div className='mt-2.5 flex flex-wrap gap-2'>
                {skus.map((sku) => {
                  const isSelected = sku._id === selectedSku?._id;
                  return (
                    <button
                      key={sku._id}
                      className={`flex min-w-[110px] flex-col items-start gap-0.5 rounded-[14px] border px-3.5 py-2.5 text-left ${
                        isSelected ? 'border-[#82c2e5] bg-[#82c2e5]/10' : 'border-border bg-white/5'
                      } ${sku.available ? '' : 'opacity-45'}`}
                      disabled={!sku.available}
                      type='button'
                      onClick={() => setSelectedSkuId(sku._id)}
                    >
                      <span className='text-[14.5px] font-extrabold'>{sku.name ?? product.name}</span>
                      <span className='text-[13px] font-semibold text-fg-soft'>
                        {sku.available ? formatPrice(sku.price) : t.notAvailable}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(product.addOns ?? []).length > 0 && <div className='mt-[26px] h-px bg-border' />}

          {(product.addOns ?? []).map((section) => {
            const min = section.minimumQuantity ?? 0;
            const max = section.maximumQuantity ?? 0;
            const invalid = !!errors[section._id];
            return (
              <div key={section._id} id={`opt-${section._id}`} className='mt-[26px]'>
                <div className='flex flex-col items-start gap-[3px]'>
                  <h3 className='m-0 text-[18px] font-extrabold tracking-[-0.01em] text-white'>{section.name}</h3>
                  {(min > 0 || max > 0) && (
                    <span className={cn('text-[12px] font-semibold', invalid ? 'text-error-text' : 'text-muted-foreground')}>
                      {min > 0 ? `${t.chooseMin} ${min}` : `${t.chooseUpTo} ${max}`}
                    </span>
                  )}
                </div>

                <div className='mt-3 flex flex-col'>
                  {section.options.map((option) => {
                    const qty = selected[section._id]?.[option._id] ?? 0;
                    const on = qty > 0;
                    const price = option.price > 0 ? `+ ${formatPrice(option.price)}` : t.free;

                    if (!section.isMultipleSelectionAllowed) {
                      return (
                        <button
                          key={option._id}
                          onClick={() => setOption(section, option._id, on ? 0 : 1)}
                          className='flex items-center gap-3 border-b border-border py-3.5 text-left transition active:scale-[0.98]'>
                          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-primary bg-primary' : 'border-fg-faint')}>
                            {on && <Check className='h-3 w-3 text-selected-text' strokeWidth={3} />}
                          </span>
                          <span className='min-w-0 flex-1'>
                            <span className='block text-[15px] font-bold text-white'>{option.name}</span>
                          </span>
                          <span className='text-[13.5px] font-bold text-muted-foreground'>{price}</span>
                        </button>
                      );
                    }

                    return (
                      <div key={option._id} className='flex items-center gap-3 border-b border-border py-3'>
                        <span className='min-w-0 flex-1 text-[15px] font-semibold text-white'>{option.name}</span>
                        <span className='text-[13.5px] font-bold text-muted-foreground'>{price}</span>
                        {qty === 0 ? (
                          <button
                            onClick={() => setOption(section, option._id, 1)}
                            aria-label={`${t.add}: ${option.name}`}
                            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary text-selected-text transition after:absolute after:-inset-1.5 after:content-[''] active:scale-[0.85]">
                            <Plus className='h-4 w-4' strokeWidth={2.6} />
                          </button>
                        ) : (
                          <div className='flex shrink-0 items-center gap-1 rounded-[11px] bg-card p-1'>
                            <button
                              onClick={() => setOption(section, option._id, qty - 1)}
                              aria-label={t.decreaseQuantity}
                              className="relative flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-surface-3 text-white after:absolute after:-inset-[7px] after:content-['']">
                              <Minus className='h-4 w-4' strokeWidth={2.6} />
                            </button>
                            <span className='min-w-5 text-center text-[14.5px] font-extrabold'>{qty}</span>
                            <button
                              onClick={() => setOption(section, option._id, qty + 1)}
                              aria-label={t.increaseQuantity}
                              className="relative flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary text-selected-text after:absolute after:-inset-[7px] after:content-['']">
                              <Plus className='h-4 w-4' strokeWidth={2.6} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Note — the same optional field as the desktop modal. */}
          <div className='mt-[26px] h-px bg-border' />
          <h3 className='m-0 mt-[26px] text-[18px] font-extrabold tracking-[-0.01em] text-white'>
            <label htmlFor='product-note-mobile'>{t.itemNoteTitle}</label>
          </h3>
          <div className='mt-3 flex items-start gap-3 rounded-[14px] border border-border bg-card px-4 py-3.5'>
            <Pencil className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
            <textarea
              id='product-note-mobile'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.itemNotePlaceholder}
              maxLength={ITEM_NOTE_MAX}
              rows={2}
              className='min-w-0 flex-1 resize-none border-none bg-transparent text-base font-medium leading-relaxed text-white outline-none'
            />
          </div>
        </div>
      </div>

      {/* Quantity + add, pinned above the home indicator. */}
      <div className='absolute inset-x-0 bottom-0 z-[6] flex items-center gap-3 bg-background px-4 pt-3' style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <div className='flex shrink-0 items-center gap-1 rounded-[13px] bg-card p-[5px]'>
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={unavailable}
            aria-label={t.decreaseQuantity}
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white after:absolute after:-inset-[5px] after:content-[''] disabled:opacity-40">
            <Minus className='h-[18px] w-[18px]' strokeWidth={2.4} />
          </button>
          <span className='min-w-6 text-center text-[15px] font-extrabold'>{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            disabled={unavailable}
            aria-label={t.increaseQuantity}
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white after:absolute after:-inset-[5px] after:content-[''] disabled:opacity-40">
            <Plus className='h-[18px] w-[18px]' strokeWidth={2.4} />
          </button>
        </div>
        <button
          onClick={submit}
          disabled={unavailable}
          className='h-[52px] flex-1 rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:bg-card disabled:text-fg-disabled disabled:active:scale-100'>
          {unavailable ? t.productSoldOut : `${t.addToCart} · ${formatPrice(total)}`}
        </button>
      </div>
    </MobileShell>
  );
}
