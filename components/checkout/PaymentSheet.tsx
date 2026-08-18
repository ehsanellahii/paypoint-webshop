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
export type PaymentMethod = 'cash' | 'card' | 'cardWallets' | 'paypal' | 'klarna';

/** Every row the sheet can draw. */
type MethodId = PaymentMethod;

/**
 * Client id → the value the order endpoint stores. The server enum also has
 * `card`, `stripe` and `online`, which nothing selects yet.
 */
export const ORDER_PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: 'cash',
  // The terminal at the counter or the door, not an online card.
  card: 'ec-card reader',
  cardWallets: 'card',
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

/* Cards and wallets share one row, so the tile shows a card rather than any
   single brand — which of them the customer actually gets is Stripe's call. */
const CardsMark = () => (
  <svg width='22' height='16' viewBox='0 0 24 17' fill='none' aria-hidden>
    <rect x='0.75' y='0.75' width='22.5' height='15.5' rx='2.5' fill='#1a1f71' />
    <rect x='0.75' y='4' width='22.5' height='3' fill='#0f1348' />
    <rect x='3' y='10.5' width='7' height='2' rx='1' fill='#ffffff' opacity='0.85' />
    <circle cx='17' cy='11.5' r='2.6' fill='#eb001b' opacity='0.9' />
    <circle cx='19.6' cy='11.5' r='2.6' fill='#f79e1b' opacity='0.9' />
  </svg>
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
  { id: 'cardWallets', method: 'cardWallets', mark: <CardsMark />, tileClass: 'bg-white', group: 'cards' },
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
      return t.ecCard ?? 'EC card';
    case 'cardWallets':
      return t.cardAndWallets ?? 'Card & wallets';
    case 'paypal':
      return 'PayPal';
    case 'klarna':
      return 'Klarna';
  }
}

/**
 * The label for a payment method as the **server** records it.
 *
 * Orders store the server's enum (`ec-card reader`, `applePay`), not the id the
 * sheet uses, so a screen reading an order back needs this rather than
 * `paymentMethodLabel` above. Brand names are deliberately not translated —
 * Klarna is Klarna in every language.
 */
export function serverPaymentMethodLabel(value: string | undefined, t: any): string {
  switch (value) {
    case 'cash':
      return t.cash;
    case 'ec-card reader':
      return t.ecCard ?? 'EC card';
    case 'card':
      return t.cardAndWallets ?? 'Card & wallets';
    // Orders placed before cards and wallets shared a row.
    case 'applePay':
      return 'Apple Pay';
    case 'paypal':
      return 'PayPal';
    case 'klarna':
      return 'Klarna';
    case 'stripe':
    case 'online':
      return t.onlinePayment;
    default:
      return value ?? '';
  }
}

/** The line under a chosen method, matching what the sheet itself shows. */
export function paymentMethodSub(m: PaymentMethod, t: any, isDelivery: boolean): string {
  switch (m) {
    case 'cash':
    case 'card':
      return isDelivery ? t.onDelivery : t.onPickup;
    case 'cardWallets':
      return t.cardAndWalletsSub ?? 'Visa, Mastercard, Apple Pay, Google Pay';
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

  /*
   * Every online method depends on the same thing: Stripe willing to take a
   * charge on this restaurant's connected account. Showing them regardless
   * meant a store with no Stripe link still offered PayPal, reserved an order,
   * and only then failed with "this store cannot take online payments yet" —
   * after the customer had committed.
   */
  const canPayOnline = !!storeInfo?.stripeChargesEnabled;

  const enabled: Record<MethodId, boolean> = {
    // Cash and the EC reader are the two the store payload actually toggles.
    cash: !!storeInfo?.settings?.paymentMethods?.cash,
    card: !!storeInfo?.settings?.paymentMethods?.ecCardReader,
    /*
     * The store payload carries no per-method flag for these, so they stand or
     * fall together with the connected account. Which of them the customer
     * actually sees is then Stripe's decision, not ours: the payment sheet
     * renders whatever the account has enabled.
     */
    /*
     * One row for cards and wallets, rather than a row per wallet.
     *
     * The sheet cannot know what the customer's device supports — Apple Pay
     * only appears on Safari with a card configured, Google Pay only on
     * Chrome/Android — so naming them here meant an Android customer had to
     * choose "Apple Pay" to reach the card form. Stripe's element already
     * offers exactly what the device and the connected account support, so
     * this row hands the decision to it.
     */
    cardWallets: canPayOnline,
    paypal: canPayOnline,
    klarna: canPayOnline,
  };

  const label: Record<MethodId, string> = {
    cardWallets: t.cardAndWallets ?? 'Card & wallets',
    cash: t.cash,
    // Distinct from the online card row above — this one is the terminal.
    card: t.ecCard ?? 'EC card',
    paypal: 'PayPal',
    klarna: 'Klarna',
  };

  const sub: Record<MethodId, string> = {
    cardWallets: t.cardAndWalletsSub ?? 'Visa, Mastercard, Apple Pay, Google Pay',
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
