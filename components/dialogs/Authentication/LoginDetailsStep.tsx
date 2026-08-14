'use client';

import React from 'react';
import { AlertCircle, Loader2, Phone, User } from 'lucide-react';
import type { LoginFormValues } from './auth.schema';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { cn } from '~/lib/utils';

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
};

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

export default function LoginDetailsStep({ loading, values, errors, onChange, onClose, onSendOtp, sendError, withName }: Props) {
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
