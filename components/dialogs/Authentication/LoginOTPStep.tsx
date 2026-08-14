'use client';

import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import OtpInput from 'react-otp-input';
import { useLanguage } from '~/contexts/language-context';
import { cn } from '~/lib/utils';

type Props = {
  disabled: boolean;
  phoneLabel: string;
  otp: string;
  otpError?: string;
  otpLength?: number;
  onChangeOtp: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
  onVerify: () => void;
  /** Shown as the prototype's demo chip while the mock sign-in flow is active. */
  demoCode?: string;
};

export default function LoginOtpStep({ disabled, phoneLabel, otp, otpError, otpLength = 6, onChangeOtp, onBack, onVerify, demoCode }: Props) {
  const { t } = useLanguage();
  const [focusIdx, setFocusIdx] = useState(-1);

  // The prototype keeps the CTA in its muted state until every digit is in.
  const complete = otp.length === otpLength;
  const ready = complete && !disabled;

  return (
    <div className='relative flex min-w-0 flex-col justify-center px-6 pb-10 pt-20 sm:px-12 sm:pb-[54px] sm:pt-[84px]'>
      <button
        onClick={onBack}
        aria-label={t.back}
        disabled={disabled}
        className='absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-[0.92]'>
        <ArrowLeft className='h-5 w-5' strokeWidth={2} />
      </button>

      <h1 className='m-0 text-[clamp(26px,6vw,34px)] font-extrabold leading-[1.1] tracking-[-0.02em]'>{t.otpTitle}</h1>
      <p className='mt-[11px] text-[15px] font-medium text-muted-foreground'>
        {t.otpSentTo} <span className='font-bold text-white'>{phoneLabel}</span>
      </p>

      <div className='mt-7'>
        <OtpInput
          value={otp}
          onChange={onChangeOtp}
          numInputs={otpLength}
          shouldAutoFocus
          inputType='tel'
          containerStyle='flex w-full gap-2 sm:gap-3'
          renderInput={(props, index) => {
            const filled = typeof props.value === 'string' && props.value.length > 0;
            const active = focusIdx === index;
            return (
              <input
                {...props}
                onFocus={(e) => {
                  props.onFocus?.(e);
                  setFocusIdx(index);
                }}
                onBlur={(e) => {
                  props.onBlur?.(e);
                  setFocusIdx((i) => (i === index ? -1 : i));
                }}
                style={{
                  // `flex-basis: 0` so the boxes divide the row evenly rather than
                  // starting from the input's intrinsic character width.
                  flex: '1 1 0',
                  minWidth: 0,
                  width: '100%',
                  height: 62,
                  borderRadius: 16,
                  background: filled ? 'var(--elevated)' : 'var(--surface-2)',
                  border: `2px solid ${active ? 'rgba(255,255,255,.9)' : filled ? 'rgba(255,255,255,.25)' : 'transparent'}`,
                  color: '#fff',
                  fontSize: 26,
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            );
          }}
        />
      </div>

      {!!otpError && (
        <div className='mt-4 flex items-center gap-2 rounded-xl bg-destructive/12 px-[13px] py-[11px]'>
          <svg width='16' height='16' viewBox='0 0 20 20' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round' className='shrink-0 text-destructive'>
            <circle cx='10' cy='10' r='7.5' />
            <path d='M10 6v4.5M10 13.5h.01' />
          </svg>
          <span className='text-[13px] font-semibold text-[#ffb3aa]'>{otpError}</span>
        </div>
      )}

      <button
        onClick={onVerify}
        disabled={!ready}
        className={cn(
          'mt-[18px] flex h-[54px] w-full items-center justify-center gap-[9px] rounded-[15px] text-[15px] font-extrabold transition',
          ready ? 'bg-primary text-selected-text active:scale-[0.98]' : 'cursor-not-allowed bg-surface-3 text-muted-foreground-2'
        )}>
        {disabled && <Loader2 className='h-[18px] w-[18px] animate-spin' />}
        {t.confirm}
      </button>

      {demoCode && (
        <div className='mt-4 inline-flex self-start items-center gap-2 rounded-[11px] border border-border bg-background px-[13px] py-2 text-[12.5px] font-semibold text-muted-foreground'>
          {t.demoCode}: <span className='font-extrabold tracking-[0.1em] text-white'>{demoCode}</span>
        </div>
      )}
    </div>
  );
}
