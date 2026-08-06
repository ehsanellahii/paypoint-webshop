'use client';

import React from 'react';
import PhoneNumberField from '~/components/PhoneField';
import type { LoginFormValues } from './auth.schema';
import { Loader2 } from 'lucide-react';

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

type Props = {
  t: any;
  loading: boolean;

  values: LoginFormValues;
  errors: FieldErrors;

  onChange: <K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) => void;

  onClose: () => void;
  onSendOtp: () => void;
};

export default function LoginDetailsStep({ t, loading, values, errors, onChange, onClose, onSendOtp }: Props) {
  return (
    <>
      <div className='flex-1 overflow-y-auto flex flex-col gap-y-3 px-4 py-6'>
        <PhoneNumberField
          id='phoneNumber'
          label={t.phoneNumber}
          codeValue={values.phoneCode}
          numberValue={values.phoneNumber}
          onChangeCode={(v) => onChange('phoneCode', v)}
          onChangeNumber={(v) => onChange('phoneNumber', v)}
          error={errors.phoneNumber || errors.phoneCode}
          required
          disabled={loading}
          helperText={t?.phoneHelper ?? 'Include your mobile number without leading 0'}
        />
      </div>

      <div className='flex items-center justify-between gap-2 border-t border-border bg-card px-6 py-4'>
        <button onClick={onClose} className='rounded-[12px] bg-surface-3 px-4 py-3 font-bold text-white transition hover:bg-elevated' disabled={loading}>
          {t?.close ?? 'Close'}
        </button>

        <button
          onClick={onSendOtp}
          className='flex items-center justify-center rounded-[12px] bg-primary px-4 py-3 font-extrabold text-selected-text disabled:opacity-60'
          disabled={loading}>
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              {t.sendOtp}
            </>
          ) : (
            t.sendOtp
          )}
          {}
        </button>
      </div>
    </>
  );
}
