'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';

import MobileSheet from '~/components/mobile/MobileSheet';
import { useIsMobile } from '~/contexts/device-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';

/**
 * The methods checkout can hand back. Each maps to a value in the server's
 * `paymentMethodEnum` — see ORDER_PAYMENT_METHOD below.
 *
 * `card` is the in-store EC/girocard reader, kept under that name because the
 * order payload has always mapped it to `ec-card reader`.
 */
export type PaymentMethod = 'cash' | 'card' | 'applePay' | 'paypal' | 'klarna';

/** Every method the design draws. */
type MethodId = 'creditCard' | PaymentMethod;

/**
 * Client id → the value the order endpoint stores. The server enum also has
 * `card`, `stripe` and `online`, which nothing selects yet.
 */
export const ORDER_PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: 'cash',
  card: 'ec-card reader',
  applePay: 'applePay',
  paypal: 'paypal',
  klarna: 'klarna',
};

type Props = {
  open: boolean;
  onClose: () => void;
  value: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
};

/* -------------------------------------------------------------- brand marks */
/* Drawn rather than imported: these are the payment networks' own wordmarks,
   sized to the design's 46×32 tile. */

const VisaMark = () => <span className='text-[11px] font-black italic tracking-[0.02em] text-[#1a1f71]'>VISA</span>;

const ApplePayMark = () => (
  <span className='flex items-center gap-px'>
    <svg width='13' height='15' viewBox='0 0 22 26' fill='#000' aria-hidden>
      <path d='M15.3 13.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 7.9.7.9 1.4 2 2.5 1.9 1-.04 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-.9 2.4-1.8c.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.8zM13.4 7.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z' />
    </svg>
    <span className='text-[12.5px] font-bold text-black'>Pay</span>
  </span>
);

const CashMark = () => (
  <svg width='22' height='18' viewBox='0 0 24 20' fill='none' stroke='#2e9e5b' strokeWidth={1.8} aria-hidden>
    <rect x='1.5' y='3.5' width='21' height='13' rx='2' />
    <circle cx='12' cy='10' r='3' />
  </svg>
);

const EcMark = () => <span className='text-[11px] font-black tracking-[0.03em] text-[#004a93]'>EC</span>;

const PaypalMark = () => (
  <span className='text-[10.5px] font-black italic'>
    <span className='text-[#003087]'>Pay</span>
    <span className='text-[#009cde]'>Pal</span>
  </span>
);

const KlarnaMark = () => <span className='text-[10px] font-extrabold tracking-[-0.01em] text-[#0a0b09]'>Klarna.</span>;

/* ------------------------------------------------------------------ registry */

type MethodSpec = {
  id: MethodId;
  /** The value handed back to checkout, or null while the method is display-only. */
  method: PaymentMethod | null;
  mark: React.ReactNode;
  /** Klarna brands its tile pink; every other mark sits on white. */
  tileClass: string;
  group: 'cards' | 'other';
};

/*
 * Order matters: the design lists the other-methods group as
 * Apple Pay, cash, EC/girocard, PayPal, Klarna.
 */
const METHODS: MethodSpec[] = [
  { id: 'creditCard', method: null, mark: <VisaMark />, tileClass: 'bg-white', group: 'cards' },
  { id: 'applePay', method: 'applePay', mark: <ApplePayMark />, tileClass: 'bg-white', group: 'other' },
  { id: 'cash', method: 'cash', mark: <CashMark />, tileClass: 'bg-white', group: 'other' },
  { id: 'card', method: 'card', mark: <EcMark />, tileClass: 'bg-white', group: 'other' },
  { id: 'paypal', method: 'paypal', mark: <PaypalMark />, tileClass: 'bg-white', group: 'other' },
  { id: 'klarna', method: 'klarna', mark: <KlarnaMark />, tileClass: 'bg-[#ffb3c7]', group: 'other' },
];

/** The name to show once a method is chosen — used by the checkout summary rows. */
export function paymentMethodLabel(m: PaymentMethod, t: any): string {
  switch (m) {
    case 'cash':
      return t.cash;
    case 'card':
      return t.posCardPayment;
    case 'applePay':
      return 'Apple Pay';
    case 'paypal':
      return 'PayPal';
    case 'klarna':
      return 'Klarna';
  }
}

/** The line under a chosen method, matching what the sheet itself shows. */
export function paymentMethodSub(m: PaymentMethod, t: any, isDelivery: boolean): string {
  switch (m) {
    case 'cash':
    case 'card':
      return isDelivery ? t.onDelivery : t.onPickup;
    case 'applePay':
      return 'iPhone';
    case 'paypal':
      return t.onlinePayment;
    case 'klarna':
      return t.invoiceOrInstalments;
  }
}

export default function PaymentSheet({ open, onClose, value, onSelect }: Props) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const storeInfo = useStore();
  const { orderType } = useAddress();
  const isDelivery = orderType === 'delivery';

  /*
   * The design's reference build hardcodes six methods with no processing
   * behind them. We render the same sheet but only for what the store actually
   * accepts, so a tenant offering cash alone sees one row rather than five it
   * cannot take. Adding a method later is a line in this map plus backend
   * support — not a redesign.
   */
  const enabled: Record<MethodId, boolean> = {
    // No card row: cards belong to Stripe, so this list can only mirror it.
    creditCard: false,
    // Cash and the EC reader are the two the store payload actually toggles.
    cash: !!storeInfo?.settings?.paymentMethods?.cash,
    card: !!storeInfo?.settings?.paymentMethods?.ecCardReader,
    /*
     * The store payload has no flag for these three, so they are shown for
     * every store. The order endpoint accepts the values, but nothing charges
     * yet — see the note on ORDER_PAYMENT_METHOD.
     */
    applePay: true,
    paypal: true,
    klarna: true,
  };

  const label: Record<MethodId, string> = {
    creditCard: t.posCardPayment,
    applePay: 'Apple Pay',
    cash: t.cash,
    card: t.posCardPayment,
    paypal: 'PayPal',
    klarna: 'Klarna',
  };

  const sub: Record<MethodId, string> = {
    creditCard: 'Visa',
    applePay: 'iPhone',
    paypal: t.onlinePayment,
    klarna: t.invoiceOrInstalments,
    cash: isDelivery ? t.onDelivery : t.onPickup,
    card: isDelivery ? t.onDelivery : t.onPickup,
  };

  const visible = METHODS.filter((m) => enabled[m.id]);
  const cards = visible.filter((m) => m.group === 'cards');
  const others = visible.filter((m) => m.group === 'other');

  const row = (m: MethodSpec) => {
    const selected = !!m.method && value === m.method;
    return (
      <button
        key={m.id}
        type='button'
        onClick={() => {
          if (!m.method) return;
          onSelect(m.method);
          onClose();
        }}
        className='flex w-full items-center gap-3.5 px-1 py-3 text-left transition hover:opacity-90'>
        <span className={`flex h-8 w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-md ${m.tileClass}`}>{m.mark}</span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-bold text-white'>{label[m.id]}</span>
          <span className='mt-px block truncate text-[12.5px] font-medium text-muted-foreground'>{sub[m.id]}</span>
        </span>
        {selected && (
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='#46d17f' strokeWidth={2.6} strokeLinecap='round' strokeLinejoin='round' className='shrink-0' aria-hidden>
            <path d='M4.5 12.5l5 5 10-11' />
          </svg>
        )}
      </button>
    );
  };

  const groupLabel = (text: string, first?: boolean) => (
    <div className={`text-[13px] font-extrabold text-white ${first ? 'mb-1 mt-0.5' : 'mb-1 mt-3.5'}`}>{text}</div>
  );

  const body = (
    <>
      {cards.length > 0 && (
        <>
          {groupLabel(t.paymentCards, true)}
          {/*
            No "add a new card" row, though the design has one. Cards are Stripe's
            to own — the card itself, the entry form and PCI scope all live there,
            so the list here can only ever mirror what Stripe already holds. A
            button that collects a card outside it would be the wrong door.
          */}
          <div className='flex flex-col'>{cards.map(row)}</div>
        </>
      )}

      {others.length > 0 && (
        <>
          {groupLabel(t.paymentOtherMethods, cards.length === 0)}
          <div className='flex flex-col'>{others.map(row)}</div>
        </>
      )}

      {visible.length === 0 && <div className='py-6 text-center text-sm text-muted-foreground'>{t.notAvailable}</div>}
    </>
  );

  // On a phone the design puts this at the bottom edge, not in the middle.
  if (isMobile) {
    return (
      <MobileSheet open={open} onClose={onClose} title={t.paymentMethod}>
        {body}
      </MobileSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[62] bg-black/60 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-3 pt-6 sm:items-center sm:p-8'>
          <Dialog.Popup className='anim-scalein w-[440px] max-w-full rounded-[22px] border border-border-strong bg-card p-5.5'>
            <div className='mb-4 flex items-center justify-between'>
              <Dialog.Title className='text-lg font-extrabold'>{t.paymentMethod}</Dialog.Title>
              <Dialog.Close aria-label={t.close} className='flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:text-white'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>

            {body}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
