'use client';

import { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';

import MobileSheet from '~/components/mobile/MobileSheet';
import { useIsMobile } from '~/contexts/device-context';
import { useLanguage } from '~/contexts/language-context';
import { formatPrice } from '~/lib/api';

/*
 * Stripe.js is loaded per connected account, because charges are created
 * directly on the restaurant's account. Cached by account id so switching
 * stores in one session does not refetch the library — `loadStripe` returns the
 * same promise for the same arguments only if we hold it ourselves.
 */
const clients = new Map<string, Promise<Stripe | null>>();

function stripeFor(publishableKey: string, stripeAccount: string) {
  const key = `${publishableKey}:${stripeAccount}`;
  if (!clients.has(key)) clients.set(key, loadStripe(publishableKey, { stripeAccount }));
  return clients.get(key)!;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** From `createPaymentIntent` — both are needed before this can mount. */
  clientSecret: string;
  stripeAccountId: string;
  amount: number;
  /** Where Stripe sends the customer back after an off-site method. */
  returnUrl: string;
};

/** The form itself, inside <Elements> so the Stripe hooks have a context. */
function PayForm({ amount, returnUrl, onClose }: { amount: number; returnUrl: string; onClose: () => void }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError(null);

    /*
     * `redirect: 'if_required'` keeps card payments on the page and only leaves
     * for methods that insist on it (PayPal, Klarna). Either way the order is
     * confirmed by the webhook, not here — this promise resolving is not proof
     * the money arrived.
     */
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (err) {
      setError(err.message ?? (t.paymentFailed ?? 'Payment failed'));
      setSubmitting(false);
      return;
    }

    // Nothing redirected, so the card succeeded. The confirmation screen reads
    // the order back from the API and will show it as soon as the webhook lands.
    window.location.assign(returnUrl);
  };

  return (
    <form onSubmit={submit}>
      <PaymentElement
        onReady={() => setReady(true)}
        options={{ layout: 'tabs' }}
      />

      {error && (
        <div className='mt-3 flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
          <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
          <span>{error}</span>
        </div>
      )}

      <button
        type='submit'
        disabled={!stripe || !ready || submitting}
        className='mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
        {submitting ? <Loader2 className='h-5 w-5 animate-spin' /> : `${t.payNow ?? 'Pay now'} · ${formatPrice(amount / 100)}`}
      </button>

      <button type='button' onClick={onClose} disabled={submitting} className='mt-2.5 h-11 w-full text-[13.5px] font-bold text-muted-foreground disabled:opacity-50'>
        {t.cancel ?? 'Cancel'}
      </button>
    </form>
  );
}

export default function StripePaymentSheet({ open, onClose, clientSecret, stripeAccountId, amount, returnUrl }: Props) {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [publishableKey, setPublishableKey] = useState('');

  useEffect(() => {
    setPublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');
  }, []);

  const stripePromise = useMemo(
    () => (publishableKey && stripeAccountId ? stripeFor(publishableKey, stripeAccountId) : null),
    [publishableKey, stripeAccountId],
  );

  if (!open) return null;

  const body =
    !stripePromise || !clientSecret ? (
      <div className='flex justify-center py-10'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    ) : (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          locale: language === 'de' ? 'de' : 'en',
          // Stripe's own theme, nudged to the app's surfaces so the form does
          // not arrive as a white box in a dark sheet.
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#ffffff',
              colorBackground: '#1c1c1e',
              colorText: '#ffffff',
              colorDanger: '#ff8a7e',
              borderRadius: '14px',
              fontFamily: 'inherit',
            },
          },
        }}>
        <PayForm amount={amount} returnUrl={returnUrl} onClose={onClose} />
      </Elements>
    );

  if (isMobile) {
    return (
      <MobileSheet open={open} onClose={onClose} title={t.payment ?? 'Payment'} maxHeight='92%'>
        {body}
      </MobileSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[64] bg-black/60' />
        <Dialog.Viewport className='fixed inset-0 z-[64] flex items-start justify-center overflow-y-auto p-3 pt-8 sm:items-center sm:p-8'>
          <Dialog.Popup className='anim-scalein w-[460px] max-w-full rounded-[22px] border border-border-strong bg-card p-5.5'>
            <div className='mb-4 flex items-center justify-between'>
              <Dialog.Title className='text-lg font-extrabold'>{t.payment ?? 'Payment'}</Dialog.Title>
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
