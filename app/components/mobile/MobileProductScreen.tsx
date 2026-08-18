'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Minus, Plus, X } from 'lucide-react';

import MobileShell from '~/components/mobile/MobileShell';
import { fetchMenuData, formatPrice, getAllProducts } from '~/lib/api';
import { AddOnGroup, cn, getImageURL, MenuProduct } from '~/lib/utils';
import SmartImage from '~/lib/SmartImage';
import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

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

  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Customization>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetchMenuData(storeInfo?.adminId, storeInfo?.storeId, storeInfo?.apiKey)
      .then((data) => {
        if (cancelled) return;
        const found = getAllProducts(data).find((p) => String(p.id) === productId || String(p._id) === productId) ?? null;
        setProduct(found);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [productId, storeInfo?.adminId, storeInfo?.storeId, storeInfo?.apiKey]);

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
    let sum = product.currentPrice;
    (product.addOns ?? []).forEach((section) => {
      Object.entries(selected[section._id] ?? {}).forEach(([optionId, qty]) => {
        const opt = section.options.find((o) => o._id === optionId);
        if (opt && qty > 0) sum += opt.price * qty;
      });
    });
    return sum * quantity;
  }, [product, selected, quantity]);

  const submit = () => {
    if (!product) return;
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
    addToCart(product, quantity, selected);
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
    return (
      <MobileShell>
        <div className='flex h-full flex-col items-center justify-center gap-4 px-6 text-center'>
          <div className='text-lg font-extrabold'>{t.noResults}</div>
          <button onClick={toMenu} className='h-12 rounded-[14px] bg-primary px-5 text-sm font-extrabold text-selected-text'>
            {t.continueToMenu}
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
          {img ? <SmartImage src={img} alt={product.name} sizes='440px' className='object-cover' wrapperClassName='absolute inset-0' /> : <div className='absolute inset-0 bg-card' />}
        </div>

        {/* The sheet overlaps the photo, so the title sits over its lower edge. */}
        <div className='relative z-[2] -mt-[30px] px-5 pb-[120px] pt-1'>
          <h1 className='m-0 mt-[30px] text-[26px] font-black leading-[1.15] tracking-[-0.01em] text-white'>{product.name}</h1>
          <div className='mt-2 text-[19px] font-extrabold text-[#82c2e5]'>{formatPrice(product.currentPrice)}</div>
          {product.description && <div className='mt-2.5 text-sm font-medium leading-[1.55] text-fg-tertiary'>{product.description}</div>}

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
                            aria-label={t.add}
                            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary text-selected-text transition active:scale-[0.85]'>
                            <Plus className='h-4 w-4' strokeWidth={2.6} />
                          </button>
                        ) : (
                          <div className='flex shrink-0 items-center gap-1 rounded-[11px] bg-card p-1'>
                            <button onClick={() => setOption(section, option._id, qty - 1)} aria-label='less' className='flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-surface-3 text-white'>
                              <Minus className='h-4 w-4' strokeWidth={2.6} />
                            </button>
                            <span className='min-w-5 text-center text-[14.5px] font-extrabold'>{qty}</span>
                            <button onClick={() => setOption(section, option._id, qty + 1)} aria-label='more' className='flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary text-selected-text'>
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
        </div>
      </div>

      {/* Quantity + add, pinned above the home indicator. */}
      <div className='absolute inset-x-0 bottom-0 z-[6] flex items-center gap-3 bg-background px-4 pt-3' style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <div className='flex shrink-0 items-center gap-1 rounded-[13px] bg-card p-[5px]'>
          <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label='less' className='flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white'>
            <Minus className='h-[18px] w-[18px]' strokeWidth={2.4} />
          </button>
          <span className='min-w-6 text-center text-[15px] font-extrabold'>{quantity}</span>
          <button onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label='more' className='flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white'>
            <Plus className='h-[18px] w-[18px]' strokeWidth={2.4} />
          </button>
        </div>
        <button onClick={submit} className='h-[52px] flex-1 rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
          {t.addToCart} · {formatPrice(total)}
        </button>
      </div>
    </MobileShell>
  );
}
