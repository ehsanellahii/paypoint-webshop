'use client';

import { Dialog } from '@base-ui/react/dialog';
import { AlertCircle, ArrowLeft, Loader2, Phone, ShieldCheck, X } from 'lucide-react';
import OtpInput from 'react-otp-input';

import MobileSheet from '~/components/mobile/MobileSheet';
import { useAuthFlow } from '~/hooks/useAuthFlow';
import { useIsMobile } from '~/contexts/device-context';
import { cn } from '~/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  /** The number already typed on the checkout form, used to seed the field. */
  phone?: string;
  /** The name already typed on the checkout form, so the account gets one. */
  name?: string;
};

/**
 * Confirms the customer holds the phone number, and nothing else.
 *
 * Deliberately not the sign-in dialog. That one offers Apple, Google and
 * "continue as guest" — none of which can satisfy this gate: the providers
 * prove an email address and never return a phone number, and the guest button
 * would close the dialog leaving the customer exactly as unverified as before.
 * Showing a sign-in menu to answer a yes/no question about a phone number was
 * the confusing part, so this asks the question on its own terms.
 *
 * The number is seeded from checkout, so in the common case the customer only
 * has to press "send code" and type the six digits.
 *
 * All the Firebase and backend handling still comes from `useAuthFlow`, shared
 * with sign-in, so there is only ever one implementation of the OTP round trip.
 */
export default function PhoneVerifyDialog({ open, onClose, phone, name }: Props) {
  const isMobile = useIsMobile();
  const a = useAuthFlow({ handleOpenChange: (next) => !next && onClose(), initialPhone: phone, initialName: name, phoneOnly: true });
  const { t } = a;

  if (!open) return null;

  // Any complaint at all, so a validation failure can never fail silently the
  // way an unrendered `customerName` error once did.
  const detailsError = a.sendError || Object.values(a.detailsErrors).find(Boolean);
  const phoneInvalid = !!(a.detailsErrors.phoneNumber || a.detailsErrors.phoneCode);

  const details = (
    <>
      <div className='flex flex-col gap-2.5'>
        <div className={cn('flex h-[54px] items-center gap-3 rounded-[15px] border-[1.5px] bg-background px-4 transition', phoneInvalid ? 'border-destructive' : 'border-white/10 focus-within:border-white/60')}>
          <Phone className='h-[19px] w-[19px] shrink-0 text-muted-foreground' strokeWidth={1.7} />
          <input
            value={a.formData.phoneCode}
            onChange={(e) => a.handleChange('phoneCode', e.target.value)}
            aria-label='Country code'
            inputMode='tel'
            disabled={a.disabled}
            className='w-[52px] shrink-0 border-none bg-transparent text-[15px] font-semibold text-white'
          />
          <span className='h-6 w-px shrink-0 bg-white/10' />
          <input
            value={a.formData.phoneNumber}
            onChange={(e) => a.handleChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
            type='tel'
            inputMode='tel'
            autoComplete='tel'
            aria-label={t.phoneNumber}
            placeholder={t.phoneNumber}
            disabled={a.disabled}
            autoFocus={!a.formData.phoneNumber}
            className='min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white placeholder:text-muted-foreground'
          />
        </div>

        {detailsError && (
          <div className='flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
            <AlertCircle className='mt-px h-[13px] w-[13px] shrink-0' strokeWidth={2} />
            <span>{detailsError}</span>
          </div>
        )}
      </div>

      <button
        onClick={a.requestOtp}
        disabled={a.disabled}
        className='mt-4 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[15px] bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
        {a.disabled && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
        {t.sendCode}
      </button>
    </>
  );

  const otpStep = (
    <>
      <button onClick={() => a.setStep('details')} className='mb-4 inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-surface-3 px-3 text-[13px] font-bold text-white'>
        <ArrowLeft className='h-4 w-4' /> {t.back}
      </button>

      <p className='text-[13px] font-medium text-muted-foreground'>
        {t.otpSentTo} <span className='font-bold text-white'>{a.normalizedPhone}</span>
      </p>

      <div className='mt-4'>
        <OtpInput
          value={a.otp}
          onChange={(v) => {
            a.setOtp(v);
            a.setOtpError(undefined);
          }}
          numInputs={6}
          shouldAutoFocus
          inputType='tel'
          containerStyle='flex w-full gap-2'
          renderInput={(props) => {
            const filled = typeof props.value === 'string' && props.value.length > 0;
            return (
              <input
                {...props}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  width: '100%',
                  height: 54,
                  borderRadius: 14,
                  /*
                   * The empty box has to read as a field on whatever surface
                   * the dialog sits on. `--card` did not: it is the desktop
                   * dialog's own background, so empty boxes vanished entirely
                   * and only appeared once typed into. `--background` is the
                   * darkest token on both devices, and the border is always
                   * drawn rather than being transparent until filled.
                   */
                  background: filled ? 'var(--surface-3)' : 'var(--background)',
                  border: `2px solid ${filled ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.14)'}`,
                  caretColor: '#fff',
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            );
          }}
        />
      </div>

      {a.otpError && (
        <div className='mt-3 flex items-center gap-2 rounded-xl bg-destructive/12 px-3.5 py-2.5'>
          <AlertCircle className='h-4 w-4 shrink-0 text-destructive' strokeWidth={2} />
          <span className='text-[13px] font-semibold text-error-text'>{a.otpError}</span>
        </div>
      )}

      <button
        onClick={a.verifyOtp}
        disabled={a.disabled || a.otp.length !== 6}
        className={cn(
          'mt-4 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[15px] text-[15px] font-extrabold transition',
          a.otp.length === 6 && !a.disabled ? 'bg-primary text-selected-text active:scale-[0.98]' : 'bg-surface-3 text-fg-disabled'
        )}>
        {a.disabled && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
        {t.confirm}
      </button>

      <button onClick={a.resendOtp} disabled={a.disabled} className='mt-2.5 h-11 w-full text-[13.5px] font-bold text-muted-foreground transition hover:text-white disabled:opacity-60'>
        {t.resendOtp}
      </button>
    </>
  );

  const body = a.step === 'details' ? details : otpStep;

  const intro = (
    <>
      <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.13]'>
        <ShieldCheck className='h-6 w-6 text-primary' strokeWidth={1.8} />
      </span>
      <h2 className='mt-3.5 text-[21px] font-extrabold leading-[1.15] tracking-[-0.01em] text-white'>{t.verifyPhoneTitle}</h2>
      <p className='mt-1.5 text-[13.5px] font-medium leading-relaxed text-muted-foreground'>{t.verifyPhoneSub}</p>
    </>
  );

  if (isMobile) {
    return (
      <MobileSheet open={open} onClose={onClose} maxHeight='88%'>
        {/* Required for Firebase phone auth on web. */}
        <div id='recaptcha-container' className='pointer-events-none absolute h-px w-px overflow-hidden opacity-0' aria-hidden />
        <div className='pb-1'>
          {a.step === 'details' && intro}
          <div className='mt-4'>{body}</div>
        </div>
      </MobileSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[72] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[72] flex items-center justify-center overflow-y-auto p-4'>
          <Dialog.Popup className='anim-scalein relative w-[420px] max-w-full rounded-[24px] border border-border-strong bg-card p-7 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            {/* Required for Firebase phone auth on web. */}
            <div id='recaptcha-container' className='pointer-events-none absolute h-px w-px overflow-hidden opacity-0' aria-hidden />

            <Dialog.Close
              aria-label={t.close}
              className='absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:text-white'>
              <X className='h-4 w-4' strokeWidth={2.2} />
            </Dialog.Close>

            <Dialog.Title className='sr-only'>{t.verifyPhoneTitle}</Dialog.Title>
            {a.step === 'details' && intro}
            <div className='mt-5'>{body}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
