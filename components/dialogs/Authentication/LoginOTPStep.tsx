'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';
import OtpInput from 'react-otp-input';

type Props = {
  t: any;
  disabled: boolean;

  phoneLabel: string;

  otp: string;
  otpError?: string;

  otpLength?: number;

  onChangeOtp: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
  onVerify: () => void;
};

export default function LoginOtpStep({ t, disabled, phoneLabel, otp, otpError, otpLength = 6, onChangeOtp, onBack, onResend, onVerify }: Props) {
  return (
    <>
      <div className='flex-1 overflow-y-auto flex flex-col gap-y-4 px-4 py-6'>
        <div className='text-sm text-muted-foreground'>
          {t?.otpSentTo ?? 'We sent an OTP to'} <span className='font-semibold text-foreground'>{phoneLabel}</span>
        </div>

        <div className='flex justify-center'>
          <OtpInput
            value={otp}
            onChange={onChangeOtp}
            numInputs={otpLength}
            shouldAutoFocus
            inputType='tel'
            renderSeparator={<span className='w-2' />}
            containerStyle='flex justify-center gap-2'
            inputStyle={{
              width: '44px',
              height: '52px',
              borderRadius: '12px',
              border: '1.5px solid rgba(255,255,255,0.16)',
              background: '#26262a',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 800,
              textAlign: 'center',
              outline: 'none',
            }}
            renderInput={(props) => <input {...props} />}
          />
        </div>

        {!!otpError && <p className='text-center text-sm text-brand-red'>{otpError}</p>}

        <button type='button' onClick={onResend} disabled={disabled} className='self-center text-sm font-semibold text-muted-foreground underline disabled:opacity-60 hover:text-white'>
          {t.resendOtp}
        </button>
      </div>

      <div className='flex items-center justify-between gap-2 border-t border-border bg-card px-6 py-4'>
        <button onClick={onBack} className='rounded-[12px] bg-surface-3 px-4 py-3 font-bold text-white transition hover:bg-elevated' disabled={disabled}>
          {t.back}
        </button>

        <button
          onClick={onVerify}
          className='flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 font-extrabold text-selected-text disabled:opacity-60'
          disabled={disabled}>
          {disabled ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              {t.verify}
            </>
          ) : (
            <> {t.verify}</>
          )}
        </button>
      </div>
    </>
  );
}
