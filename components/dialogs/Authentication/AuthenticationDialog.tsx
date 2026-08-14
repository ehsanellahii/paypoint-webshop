'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

import AuthHero from './AuthHero';
import LoginDetailsStep from './LoginDetailsStep';
import LoginOtpStep from './LoginOTPStep';
import MobileAuthScreen from '~/app/components/mobile/MobileAuthScreen';
import { useAuthFlow } from '~/hooks/useAuthFlow';
import { useIsMobile } from '~/contexts/device-context';

type Props = {
  isOpen: boolean;
  handleOpenChange: (open: boolean) => void;
  isRegistration?: boolean;
};

/**
 * Entry point for phone sign-in.
 *
 * A switch only: each presentation calls `useAuthFlow` itself, so exactly one
 * instance of the flow exists. Calling the hook here as well would leave a
 * second, dead copy holding its own reCAPTCHA verifier.
 */
export default function AuthenticationDialog(props: Props) {
  const isMobile = useIsMobile();
  // A phone gets a full screen: a centred dialog has to share the viewport with
  // the keyboard, which leaves the code input squeezed against it.
  return isMobile ? <MobileAuthScreen {...props} /> : <DesktopAuthDialog {...props} />;
}

function DesktopAuthDialog({ isOpen, handleOpenChange, isRegistration = false }: Props) {
  const {
    t, step, setStep, disabled, formData, detailsErrors, otp, setOtp, otpError, setOtpError,
    sendError, normalizedPhone, handleChange, requestOtp, verifyOtp, resendOtp, onOpenChangeInternal,
    signInWithGoogle, signInWithApple,
  } = useAuthFlow({ handleOpenChange, isRegistration });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChangeInternal}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[70] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:items-center sm:p-6'>
          {/*
            The design's auth card: a 1060px two-column panel that collapses to
            the form alone (max 460px) below 760px, where the hero is hidden.
          */}
          <Dialog.Popup className='anim-fade relative grid w-full max-w-[460px] grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] md:max-w-[1060px] md:grid-cols-[1.05fr_1fr]'>
            <Dialog.Title className='sr-only'>{step === 'details' ? (isRegistration ? t.register : t.login) : t.otpTitle}</Dialog.Title>

            {/* Required for Firebase phone auth on web. */}
            <div id='recaptcha-container' className='pointer-events-none absolute h-px w-px overflow-hidden opacity-0' aria-hidden />

            <AuthHero title={step === 'details' ? t.zoneHeroTitle : t.otpHeroTitle} sub={step === 'otp' ? t.otpHeroSub : undefined} />

            <Dialog.Close
              aria-label={t.close}
              className='absolute right-4 top-4 z-[4] flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition active:scale-90 md:right-5 md:top-5'>
              <X className='h-4 w-4' strokeWidth={2.2} />
            </Dialog.Close>

            {step === 'details' ? (
              <LoginDetailsStep
                loading={disabled}
                values={formData}
                errors={detailsErrors}
                onChange={handleChange as (key: 'phoneCode' | 'phoneNumber' | 'customerName', value: string) => void}
                onClose={() => onOpenChangeInternal(false)}
                onSendOtp={requestOtp}
                sendError={sendError}
                onGoogle={signInWithGoogle}
                onApple={signInWithApple}
                withName
              />
            ) : (
              <LoginOtpStep
                disabled={disabled}
                phoneLabel={normalizedPhone}
                otp={otp}
                otpError={otpError}
                otpLength={6}
                onChangeOtp={(v) => {
                  setOtp(v);
                  setOtpError(undefined);
                }}
                onBack={() => setStep('details')}
                onResend={resendOtp}
                onVerify={verifyOtp}
              />
            )}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
