'use client';

import { AlertCircle, ArrowLeft, Loader2, Phone, User, X } from 'lucide-react';
import OtpInput from 'react-otp-input';

import BrandMark from '~/components/menu/BrandMark';
import { useAuthFlow } from '~/hooks/useAuthFlow';
import { useStore } from '~/contexts/store-context';
import { getStoreCover } from '~/lib/storeMedia';
import { cn } from '~/lib/utils';

/** The design's "oder" rule: a hairline either side of the word. */
function OrDivider({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className='h-px flex-1 bg-white/10' />
      <span className='text-xs font-semibold text-muted-foreground-2'>{label}</span>
      <div className='h-px flex-1 bg-white/10' />
    </div>
  );
}

/** White provider button, 50px, per the design. */
function SocialButton({ label, children, disabled, onClick }: { label: string; children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className='flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-white text-sm font-bold text-black transition active:scale-[0.97] disabled:opacity-60'>
      {children}
      {label}
    </button>
  );
}

/** Uppercase field label, per the mobile design. */
function Label({ children }: { children: React.ReactNode }) {
  return <div className='mb-2 pl-0.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-white'>{children}</div>;
}

/** 50px input row on the design's dedicated input surface. */
function Field({ icon: Icon, invalid, children }: { icon: typeof User; invalid?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('flex h-[50px] items-center gap-3 rounded-[13px] border bg-[#181b2d] px-4', invalid ? 'border-destructive' : 'border-border')}>
      <Icon className='h-5 w-5 shrink-0 text-white' strokeWidth={1.8} />
      {children}
    </div>
  );
}

const input = 'min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white placeholder:text-muted-foreground';

/**
 * Phone sign-in as a full screen (mobile).
 *
 * A screen rather than the desktop card: on a phone a centred dialog leaves the
 * keyboard fighting for room. All behaviour comes from `useAuthFlow`, shared
 * with the desktop presentation.
 */
export default function MobileAuthScreen({ isOpen, handleOpenChange, isRegistration }: { isOpen: boolean; handleOpenChange: (open: boolean) => void; isRegistration?: boolean }) {
  const a = useAuthFlow({ handleOpenChange, isRegistration });
  const storeInfo = useStore();
  const { t } = a;

  if (!isOpen) return null;

  const cover = getStoreCover(storeInfo);
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';

  return (
    <div className='fixed inset-0 z-[88] flex justify-center bg-background'>
      {/* Required for Firebase phone auth on web. */}
      <div id='recaptcha-container' className='pointer-events-none absolute h-px w-px overflow-hidden opacity-0' aria-hidden />

      <div className='noscroll flex h-full w-full max-w-[440px] flex-col overflow-y-auto'>
        {/* Cover hero */}
        <div className='relative h-[278px] flex-none overflow-hidden'>
          <div className='absolute inset-0 bg-[#0f0f11] bg-cover bg-center' style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,17,0.45)_0%,rgba(15,15,17,0.7)_55%,var(--background)_100%)]' />

          <button
            onClick={() => a.onOpenChangeInternal(false)}
            aria-label={t.close}
            className='absolute right-4 top-4 z-[3] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur'>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </button>

          <div className='relative z-[2] flex h-full flex-col justify-end px-[26px] pb-6 pt-[54px]'>
            {/*
              BrandMark, not a bare <img>: it is the design's auth-hero size
              (76px, 14px radius) and it falls back to the brand name in the
              script face, so a store with no logo does not show a gap here.
            */}
            <div className='mb-4'>
              <BrandMark size='auth' />
            </div>
            <h2 className='m-0 max-w-[300px] font-serif text-[30px] font-extrabold leading-[1.06] tracking-[-0.02em] text-white'>{t.zoneHeroTitle}</h2>
          </div>
        </div>

        <div className='relative z-[2] flex min-h-0 flex-1 flex-col px-[26px] pb-8 pt-6'>
          {a.step === 'details' ? (
            <>
              <h1 className='m-0 text-[21px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white'>{t.login}</h1>
              <p className='mt-1.5 text-[12.5px] font-medium leading-relaxed text-muted-foreground'>{t.loginSub}</p>

              <div className='mt-4 flex flex-col gap-2.5'>
                <div>
                  <Label>{t.name}</Label>
                  <Field icon={User} invalid={!!a.detailsErrors.customerName}>
                    <input
                      value={a.formData.customerName ?? ''}
                      onChange={(e) => a.handleChange('customerName', e.target.value)}
                      autoComplete='name'
                      aria-label={t.name}
                      placeholder={t.name}
                      disabled={a.disabled}
                      className={input}
                    />
                  </Field>
                </div>

                <div>
                  <Label>{t.phoneNumber}</Label>
                  <Field icon={Phone} invalid={!!(a.detailsErrors.phoneNumber || a.detailsErrors.phoneCode)}>
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
                      className={input}
                    />
                  </Field>
                </div>

                {(a.sendError || a.detailsErrors.customerName || a.detailsErrors.phoneNumber) && (
                  <div className='flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
                    <AlertCircle className='mt-px h-[13px] w-[13px] shrink-0' strokeWidth={2} />
                    <span>{a.sendError || a.detailsErrors.customerName || a.detailsErrors.phoneNumber}</span>
                  </div>
                )}
              </div>

              <button
                onClick={a.requestOtp}
                disabled={a.disabled}
                className='mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
                {a.disabled && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
                {t.login}
              </button>

              {/*
                Social sign-in, drawn to the design: an "oder" rule, then Apple
                and Google side by side on white. No provider is wired up yet —
                the handlers land with the Apple/Google work, so these are
                disabled rather than pretending to do something.
              */}
              <OrDivider label={t.or ?? 'or'} className='mt-[18px]' />

              <div className='mt-3.5 flex gap-2.5'>
                <SocialButton disabled label='Apple'>
                  <svg width='17' height='17' viewBox='0 0 22 22' fill='#000' aria-hidden>
                    <path d='M15.3 11.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 7.9.7.9 1.4 2 2.5 1.9 1-.04 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-.9 2.4-1.8c.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.8zM13.4 5.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z' />
                  </svg>
                </SocialButton>

                <SocialButton disabled label='Google'>
                  <svg width='17' height='17' viewBox='0 0 18 18' aria-hidden>
                    <path fill='#4285F4' d='M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z' />
                    <path fill='#34A853' d='M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.5 18 9 18z' />
                    <path fill='#FBBC05' d='M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z' />
                    <path fill='#EA4335' d='M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2 .9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6z' />
                  </svg>
                </SocialButton>
              </div>

              <OrDivider label={t.or ?? 'or'} className='mt-4' />

              <button
                onClick={() => a.onOpenChangeInternal(false)}
                className='mt-3.5 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-white/[0.22] bg-white/[0.05] text-base font-extrabold text-white transition active:scale-[0.98]'>
                {t.continueAsGuest}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => a.setStep('details')}
                aria-label={t.back}
                className='mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-card text-white'>
                <ArrowLeft className='h-5 w-5' strokeWidth={2} />
              </button>
              <h1 className='m-0 text-[21px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white'>{t.otpTitle}</h1>
              <p className='mt-1.5 text-[12.5px] font-medium text-muted-foreground'>
                {t.otpSentTo} <span className='font-bold text-white'>{a.normalizedPhone}</span>
              </p>

              <div className='mt-5'>
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
                          height: 56,
                          borderRadius: 14,
                          background: filled ? 'var(--surface-3)' : 'var(--card)',
                          border: `2px solid ${filled ? 'rgba(255,255,255,.25)' : 'transparent'}`,
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
                  <span className='text-[13px] font-semibold text-[#ffb3aa]'>{a.otpError}</span>
                </div>
              )}

              <button
                onClick={a.verifyOtp}
                disabled={a.disabled || a.otp.length !== 6}
                className={cn(
                  'mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl text-[15px] font-extrabold transition',
                  a.otp.length === 6 && !a.disabled ? 'bg-primary text-selected-text active:scale-[0.98]' : 'bg-surface-3 text-fg-disabled'
                )}>
                {a.disabled && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
                {t.confirm}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
