'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Info, Plus, Minus, Check, Pencil } from 'lucide-react';
import { useCart } from '~/contexts/cart-context';
import { formatPrice } from '@/lib/api';
import { Dialog } from '@base-ui/react/dialog';
import { AddOnGroup, cn, getImageURL, MenuProduct } from '~/lib/utils';
import { useLanguage } from '~/contexts/language-context';
import SmartImage from '~/lib/SmartImage';
import { useStore } from '~/contexts/store-context';

type CartItemCustomization = Record<string, Record<string, number>>; // sectionId -> { optionId -> qty }

interface ProductModalProps {
  product: MenuProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const { t, language } = useLanguage();
  const { addToCart } = useCart();
  const storeInfo = useStore();
  const logoURL = storeInfo?.settings?.logo || '';

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<CartItemCustomization>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen || !product) return;
    setQuantity(1);
    setNotes('');
    setSelectedOptions({});
    setErrors({});
  }, [isOpen, product]);

  if (!product) return null;

  const getGroupTotal = (sectionId: string, map: CartItemCustomization) => {
    const group = map[sectionId] || {};
    return Object.values(group).reduce((a, b) => a + b, 0);
  };
  const getOptionQty = (sectionId: string, optionId: string) => selectedOptions?.[sectionId]?.[optionId] ?? 0;

  const setOptionQty = (section: AddOnGroup, optionId: string, nextQty: number) => {
    const sectionId = section._id;
    setSelectedOptions((prev) => {
      const currentGroup = prev[sectionId] || {};
      nextQty = Math.max(0, Math.floor(nextQty));

      // Single-choice (radio): replace whatever was selected.
      if (!section.isMultipleSelectionAllowed) {
        if (nextQty <= 0) {
          const { [sectionId]: _omit, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sectionId]: { [optionId]: 1 } };
      }

      // Multi-qty mode
      const currentQty = currentGroup[optionId] ?? 0;
      const groupTotal = Object.values(currentGroup).reduce((a, b) => a + b, 0);
      const delta = nextQty - currentQty;
      const nextTotal = groupTotal + delta;
      if (section.maximumQuantity > 0 && nextTotal > section.maximumQuantity) return prev;

      const nextGroup: Record<string, number> = { ...currentGroup };
      if (nextQty === 0) delete nextGroup[optionId];
      else nextGroup[optionId] = nextQty;

      if (Object.keys(nextGroup).length === 0) {
        const { [sectionId]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [sectionId]: nextGroup };
    });

    setErrors((prev) => {
      if (!prev[sectionId]) return prev;
      const copy = { ...prev };
      delete copy[sectionId];
      return copy;
    });
  };

  const validateCustomizations = () => {
    const nextErrors: Record<string, string> = {};
    for (const section of product.addOns || []) {
      const total = getGroupTotal(section._id, selectedOptions);
      const min = section.minimumQuantity ?? 0;
      const max = section.maximumQuantity ?? 0;
      if (min > 0 && total < min) nextErrors[section._id] = `${section.name}: choose at least ${min}`;
      else if (max > 0 && total > max) nextErrors[section._id] = `${section.name}: choose up to ${max}`;
    }
    const firstInvalidSectionId = Object.keys(nextErrors)[0] || null;
    return { ok: firstInvalidSectionId === null, errors: nextErrors, firstInvalidSectionId };
  };

  const calculateTotalPrice = () => {
    let total = product.currentPrice;
    (product.addOns || []).forEach((section) => {
      const group = selectedOptions[section._id] || {};
      Object.entries(group).forEach(([optionId, qty]) => {
        const opt = section.options.find((i) => i._id === optionId);
        if (opt && qty > 0) total += opt.price * qty;
      });
    });
    return total * quantity;
  };

  const scrollToSection = (sectionId: string) => {
    const container = scrollRef.current;
    const el = sectionRefs.current[sectionId];
    if (!container || !el) return;
    container.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
  };

  const handleAddToCart = () => {
    const v = validateCustomizations();
    if (!v.ok) {
      setErrors(v.errors);
      if (v.firstInvalidSectionId) requestAnimationFrame(() => scrollToSection(v.firstInvalidSectionId!));
      return;
    }
    setErrors({});
    addToCart(product, quantity, selectedOptions, notes);
    onClose();
  };

  const hasPhoto = !!product.images?.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-60 bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-60 flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein relative flex max-h-[88vh] w-[560px] max-w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <Dialog.Title className='sr-only'>{product.name}</Dialog.Title>

            {/* Close */}
            <Dialog.Close
              aria-label={t.close}
              className='absolute right-4 top-4 z-[4] flex h-[38px] w-[38px] items-center justify-center rounded-full bg-black/55 text-white transition active:scale-90'>
              <X className='h-[17px] w-[17px]' strokeWidth={2.2} />
            </Dialog.Close>

            {/* Scrollable content */}
            <div ref={scrollRef} className='min-h-0 grow overflow-y-auto scrollbar-hide'>
              {hasPhoto ? (
                <div className='pmimg relative w-full bg-white'>
                  <SmartImage fallbackSrc={logoURL} src={getImageURL(product.images[0])} alt={product.name} fill className='object-contain' sizes='560px' />
                </div>
              ) : (
                <div className='h-4' />
              )}

              <div className='p-6'>
                <h2 className='m-0 font-display text-[28px] font-extrabold leading-[1.05] tracking-tight'>{product.name}</h2>
                <div className='mt-2.5 flex items-center gap-3'>
                  <span className='text-[15px] font-semibold text-fg-soft'>{formatPrice(product.currentPrice)}</span>
                </div>

                {product.description && (
                  <div className='mt-4 flex items-center gap-3 rounded-[14px] bg-white/5 px-4 py-3.5'>
                    <span className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white/10'>
                      <Info className='h-[18px] w-[18px]' />
                    </span>
                    <span className='text-[13.5px] font-semibold text-fg-on-photo'>{product.description}</span>
                  </div>
                )}

                {/* Customization groups */}
                {product.haveCustomizations &&
                  (product.addOns || []).map((section) => {
                    const min = section.minimumQuantity ?? 0;
                    const max = section.maximumQuantity ?? 0;
                    const groupTotal = getGroupTotal(section._id, selectedOptions);
                    const hasError = !!errors[section._id];
                    const required = min > 0;

                    return (
                      <div
                        key={section._id}
                        className='mt-6'
                        ref={(el) => {
                          sectionRefs.current[section._id] = el;
                        }}>
                        <div className='flex items-baseline justify-between'>
                          <h3 className='m-0 text-base font-extrabold'>
                            {section.name}
                            {!required && <span className='ml-2 text-[12.5px] font-semibold text-muted-foreground'>· {t.optional ?? 'optional'}</span>}
                          </h3>
                          {required && (
                            <span className='rounded-full bg-primary px-2.5 py-[3px] text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-selected-text'>{t.required ?? 'Required'}</span>
                          )}
                        </div>
                        {(min > 0 || max > 0) && (
                          <div className={cn('mt-1 text-[12.5px] font-medium italic', hasError ? 'text-brand-red' : 'text-muted-foreground')}>
                            {min === max && min > 0
                              ? language === 'de'
                                ? `Wähle genau ${min}`
                                : `Choose exactly ${min}`
                              : min > 0 && max > 0
                                ? language === 'de'
                                  ? `Wähle min ${min} bis ${max}`
                                  : `Choose ${min}–${max}`
                                : min > 0
                                  ? `${t.chooseMin ?? 'Choose at least'} ${min}`
                                  : `${t.chooseUpTo ?? 'Choose up to'} ${max}`}
                          </div>
                        )}

                        <div className='mt-3 flex flex-col gap-2.5'>
                          {section.options.map((item) => {
                            const qty = getOptionQty(section._id, item._id);
                            const isSelected = qty > 0;
                            const priceLabel = item.price > 0 ? `+ ${formatPrice(item.price)}` : t.free ?? 'Free';

                            if (!section.isMultipleSelectionAllowed) {
                              // radio row
                              return (
                                <button
                                  key={item._id}
                                  type='button'
                                  onClick={() => setOptionQty(section, item._id, isSelected ? 0 : 1)}
                                  className={cn(
                                    'flex items-center gap-3 rounded-[14px] border-2 px-[15px] py-3.5 text-left transition',
                                    isSelected ? 'border-white bg-surface-selected' : 'border-transparent bg-surface-3'
                                  )}>
                                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', isSelected ? 'border-white bg-white' : 'border-fg-faint')}>
                                    {isSelected && <Check className='h-[13px] w-[13px] text-black' strokeWidth={2.8} />}
                                  </span>
                                  <span className='min-w-0 flex-1'>
                                    <span className='block text-[14.5px] font-bold'>{item.name}</span>
                                  </span>
                                  <span className='text-[13.5px] font-bold text-muted-foreground'>{priceLabel}</span>
                                </button>
                              );
                            }

                            // multi-qty (stepper) row
                            const maxReached = max > 0 && groupTotal >= max && qty === 0;
                            return (
                              <div key={item._id} className='flex items-center rounded-[14px] bg-surface-3 py-2.5 pl-[15px] pr-3'>
                                <span className='flex-1 text-[14.5px] font-semibold'>{item.name}</span>
                                <span className='mr-3 text-[13.5px] font-bold text-muted-foreground'>{priceLabel}</span>
                                {qty === 0 ? (
                                  <button
                                    type='button'
                                    disabled={maxReached}
                                    onClick={() => setOptionQty(section, item._id, 1)}
                                    aria-label='add'
                                    className='flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-selected-text transition active:scale-[0.85] disabled:opacity-40'>
                                    <Plus className='h-4 w-4' strokeWidth={2.6} />
                                  </button>
                                ) : (
                                  <div className='flex items-center gap-1 rounded-[11px] bg-card p-1'>
                                    <button type='button' onClick={() => setOptionQty(section, item._id, qty - 1)} aria-label='less' className='flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-control text-white transition active:scale-[0.85]'>
                                      <Minus className='h-4 w-4' strokeWidth={2.6} />
                                    </button>
                                    <span className='min-w-5 text-center text-[14.5px] font-extrabold'>{qty}</span>
                                    <button type='button' disabled={max > 0 && groupTotal >= max} onClick={() => setOptionQty(section, item._id, qty + 1)} aria-label='more' className='flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary text-selected-text transition active:scale-[0.85] disabled:opacity-40'>
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

                {/* Note */}
                <h3 className='mt-6 text-base font-extrabold'>
                  {t.specialInstructions}
                  <span className='ml-2 text-[12.5px] font-semibold text-muted-foreground'>· {t.optional ?? 'optional'}</span>
                </h3>
                <div className='mt-3 flex items-start gap-3 rounded-[14px] border border-border bg-surface-1 px-4 py-3.5'>
                  <Pencil className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.enterDeliveryNotes ?? ''}
                    rows={2}
                    className='min-w-0 flex-1 resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-white outline-none'
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='flex shrink-0 items-center gap-4 border-t border-border px-6 py-4'>
              <div className='flex shrink-0 items-center gap-1 rounded-[13px] bg-surface-3 p-[5px]'>
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label='less' className='flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white transition active:scale-[0.85]'>
                  <Minus className='h-[18px] w-[18px]' strokeWidth={2.4} />
                </button>
                <span className='min-w-6 text-center text-[15px] font-extrabold'>{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label='more' className='flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-white transition active:scale-[0.85]'>
                  <Plus className='h-[18px] w-[18px]' strokeWidth={2.4} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                type='button'
                className='flex h-[52px] flex-1 items-center justify-center gap-2.5 rounded-[15px] bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                {t.add} · {formatPrice(calculateTotalPrice())}
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
