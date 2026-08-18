'use client';

import React from 'react';
import { AlertCircle, Loader2, Phone, User } from 'lucide-react';
import type { LoginFormValues } from './auth.schema';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { cn } from '~/lib/utils';
import { APPLE_SIGNIN_ENABLED } from '~/lib/firebase';

type FieldErrors = Partial<Record<keyof LoginFormValues | 'customerName', string>>;

type Props = {
  loading: boolean;
  values: LoginFormValues & { customerName?: string };
  errors: FieldErrors;
  onChange: (key: 'phoneCode' | 'phoneNumber' | 'customerName', value: string) => void;
  onClose: () => void;
  onSendOtp: () => void;
  /** Failure from the OTP request — shown here, since this step is still on screen. */
  sendError?: string;
  /** Registration also asks for a name. */
  withName?: boolean;
  onGoogle?: () => void;
  onApple?: () => void;
};

/** White pill, per the mobile screen's social row. */
function SocialButton({ label, children, disabled, onClick }: { label: string; children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className='flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[15px] bg-white text-sm font-bold text-black transition active:scale-[0.97] disabled:opacity-60'>
      {children}
      {label}
    </button>
  );
}

/** A 58px field on the page background with a 1.5px border, per the prototype. */
function Field({ icon: Icon, children, invalid }: { icon: typeof User; children: React.ReactNode; invalid?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-[58px] items-center gap-3 rounded-[15px] border-[1.5px] bg-background px-4 transition',
        invalid ? 'border-destructive' : 'border-white/10 focus-within:border-white/60'
      )}>
      <Icon className='h-[19px] w-[19px] shrink-0 text-muted-foreground' strokeWidth={1.7} />
      {children}
    </div>
  );
}

const inputClass = 'min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white placeholder:text-muted-foreground';

export default function LoginDetailsStep({ loading, values, errors, onChange, onClose, onSendOtp, sendError, withName, onGoogle, onApple }: Props) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const brand = storeInfo?.brandName || '';

  const fieldError = errors.customerName || errors.phoneNumber || errors.phoneCode;

  return (
    <div className='relative flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12 sm:py-[54px]'>
      <h1 className='m-0 font-serif text-[clamp(26px,6vw,32px)] font-extrabold leading-[1.1] tracking-[-0.01em]'>
        {t.loginWelcome} {brand}
      </h1>
      <p className='mt-2.5 text-[15px] font-medium leading-relaxed text-muted-foreground'>{t.loginSub}</p>

      <div className='mt-7 flex flex-col gap-3'>
        {withName && (
          <Field icon={User} invalid={!!errors.customerName}>
            <input
              value={values.customerName ?? ''}
              onChange={(e) => onChange('customerName', e.target.value)}
              aria-label={t.name}
              placeholder={t.name}
              disabled={loading}
              className={inputClass}
            />
          </Field>
        )}

        <Field icon={Phone} invalid={!!(errors.phoneNumber || errors.phoneCode)}>
          <input
            value={values.phoneCode}
            onChange={(e) => onChange('phoneCode', e.target.value)}
            aria-label='Country code'
            inputMode='tel'
            disabled={loading}
            className='w-[52px] shrink-0 border-none bg-transparent text-[15px] font-semibold text-white'
          />
          <span className='h-6 w-px shrink-0 bg-white/10' />
          <input
            value={values.phoneNumber}
            onChange={(e) => onChange('phoneNumber', e.target.value.replace(/\D/g, ''))}
            type='tel'
            inputMode='tel'
            aria-label={t.phoneNumber}
            placeholder={t.phoneNumber}
            disabled={loading}
            className={inputClass}
          />
        </Field>

        {(fieldError || sendError) && (
          <div className='flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
            <AlertCircle className='mt-px h-[13px] w-[13px] shrink-0' strokeWidth={2} />
            <span>{sendError || fieldError}</span>
          </div>
        )}

        <button
          onClick={onSendOtp}
          disabled={loading}
          className='flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[15px] bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
          {loading && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
          {t.login}
        </button>
      </div>

      <div className='my-5 flex items-center gap-3.5'>
        <div className='h-px flex-1 bg-white/10' />
        <span className='text-xs font-semibold text-muted-foreground-2'>{t.orDivider}</span>
        <div className='h-px flex-1 bg-white/10' />
      </div>

      {/* Same providers as the mobile screen, sized to the desktop card. */}
      {(onGoogle || onApple) && (
        <div className='mb-3 flex gap-2.5'>
          {APPLE_SIGNIN_ENABLED && onApple && (
            <SocialButton disabled={loading} onClick={onApple} label='Apple'>
              <svg width='17' height='17' viewBox='0 0 22 22' fill='#000' aria-hidden>
                <path d='M15.3 11.6c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 7.9.7.9 1.4 2 2.5 1.9 1-.04 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-.9 2.4-1.8c.7-1 1-2 1-2.1-.1 0-1.9-.7-1.9-2.8zM13.4 5.5c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z' />
              </svg>
            </SocialButton>
          )}
          {onGoogle && (
            <SocialButton disabled={loading} onClick={onGoogle} label='Google'>
              <svg width='17' height='17' viewBox='0 0 18 18' aria-hidden>
                <path fill='#4285F4' d='M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z' />
                <path fill='#34A853' d='M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.5 18 9 18z' />
                <path fill='#FBBC05' d='M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z' />
                <path fill='#EA4335' d='M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2 .9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6z' />
              </svg>
            </SocialButton>
          )}
        </div>
      )}

      <button
        onClick={onClose}
        disabled={loading}
        className='h-[54px] w-full rounded-[15px] border-[1.5px] border-elevated bg-transparent text-[15px] font-bold text-white transition hover:bg-surface-hover'>
        {t.continueAsGuest}
      </button>

      <p className='mt-[22px] text-xs font-medium leading-relaxed text-muted-foreground-2'>
        {t.legalNoticePrefix}{' '}
        <a href='https://byonesix.com/t-c-privacy-statement' target='_blank' rel='noopener noreferrer' className='font-semibold text-[#5b9dff]'>
          {t.termAndConditions}
        </a>{' '}
        {t.legalNoticeAnd}{' '}
        <a href='https://byonesix.com/t-c-privacy-statement' target='_blank' rel='noopener noreferrer' className='font-semibold text-[#5b9dff]'>
          {t.privacyPolicy}
        </a>
        .
      </p>
    </div>
  );
}
