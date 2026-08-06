'use client';

import React, { useMemo, useRef, useState } from 'react';
import DialogWrapper from '~/components/DialogWrapper';
import { useLanguage } from '~/contexts/language-context';

import { loginSchema, registrationSchema, RegistrationFormValues, type LoginFormValues } from './auth.schema';
import { z } from 'zod';

import LoginDetailsStep from './LoginDetailsStep';
import LoginOtpStep from './LoginOTPStep';

// ✅ your firebase auth instance (already setup by you)
import { auth } from '~/lib/firebase';

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import RegistrationDetailsStep from './RegistrationDetailsStep';
import { loginUser, registerUser, syncFavorites } from '~/lib/api';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { getFavoriteIds, setFavoritesFromIds } from '~/lib/favorites';

type Props = {
  isOpen: boolean;
  handleOpenChange: (open: boolean) => void;
  isRegistration?: boolean;
};

type Step = 'details' | 'otp';
type DetailsErrors = Partial<Record<keyof LoginFormValues, string>>;

const otpSchema = z.object({
  otp: z.string().trim().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export default function AuthenticationDialog({ isOpen, handleOpenChange, isRegistration = false }: Props) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { setUser, user } = useUser();
  const adminId = storeInfo?.adminId || '';
  const storeId = storeInfo?.storeId || '';
  const customerId = user?._id || '';
  const [step, setStep] = useState<Step>('details');
  const [disabled, setDisabled] = useState(false);

  const [formData, setFormData] = useState<LoginFormValues | RegistrationFormValues>({
    customerName: '',
    phoneCode: '+49',
    phoneNumber: '',
  });

  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>(undefined);

  // ✅ Keep firebase confirmation result (needed for verify)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // ✅ Keep recaptcha verifier instance so we don’t recreate repeatedly
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const normalizedPhone = useMemo(() => {
    const code = formData.phoneCode;
    const number = formData.phoneNumber.replace(/\s/g, '');
    return `${code}${number}`; // should be E.164 like +4915...
  }, [formData.phoneCode, formData.phoneNumber]);

  const handleChange = <K extends keyof LoginFormValues>(key: K, value: LoginFormValues[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setDetailsErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateDetails = () => {
    const result = isRegistration ? registrationSchema.safeParse(formData) : loginSchema.safeParse(formData);
    if (result.success) {
      setDetailsErrors({});
      return { ok: true as const, data: result.data };
    }
    const next: DetailsErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path?.[0] as keyof LoginFormValues | undefined;
      if (key && !next[key]) next[key] = issue.message;
    }
    setDetailsErrors(next);
    return { ok: false as const };
  };

  const setupRecaptcha = () => {
    // must exist in DOM
    const containerId = 'recaptcha-container';

    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
    });

    return recaptchaVerifierRef.current;
  };

  const requestOtp = async () => {
    const res = validateDetails();
    if (!res.ok) return;

    try {
      setDisabled(true);
      setOtp('');
      setOtpError(undefined);

      const verifier = setupRecaptcha();

      // ✅ Send SMS OTP
      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);

      confirmationResultRef.current = confirmationResult;
      setStep('otp');
    } catch (e: any) {
      // common firebase errors: auth/invalid-phone-number, auth/too-many-requests, etc.
      const msg = e?.message || t?.otpSendFailed || 'Failed to send OTP. Please try again.';
      setOtpError(msg);
    } finally {
      setDisabled(false);
    }
  };

  const verifyOtp = async () => {
    const parsed = otpSchema.safeParse({ otp });
    if (!parsed.success) {
      setOtpError(parsed.error.issues[0]?.message ?? 'Invalid OTP');
      return;
    }

    const confirmationResult = confirmationResultRef.current;
    if (!confirmationResult) {
      setOtpError(t?.otpSessionExpired ?? 'OTP session expired. Please resend OTP.');
      return;
    }

    try {
      setDisabled(true);
      setOtpError(undefined);

      // ✅ Verify code with Firebase
      await confirmationResult.confirm(parsed.data.otp);

      // ✅ Firebase token (send to your backend if you want to create/update user)
      // const idToken = await cred.user.getIdToken();
      let user = null;
      if (isRegistration) {
        user = await registerUser(adminId, storeId, (formData as RegistrationFormValues).customerName.trim(), normalizedPhone);
      } else {
        user = await loginUser(adminId, storeId, normalizedPhone);
      }
      handleOpenChange(false);
      if (user) setUser(user);
      try {
        const slug = storeInfo?.slug; // IMPORTANT: use same key you store favorites under
        const localIds = getFavoriteIds(slug!);

        const res = await syncFavorites(adminId, storeId, user._id, localIds);

        const finalIds: string[] = res?.productIds ?? [];
        setFavoritesFromIds(slug!, finalIds);
      } catch (e) {
        console.error('Favorites sync after auth failed:', e);
      }
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (code === 'auth/invalid-verification-code') {
        setOtpError(t?.invalidOtp ?? 'Invalid OTP. Please try again.');
      } else if (code === 'auth/code-expired') {
        setOtpError(t?.otpExpired ?? 'OTP expired. Please resend.');
      } else {
        setOtpError(e?.message || t?.otpVerifyFailed || 'Failed to verify OTP.');
      }
    } finally {
      setDisabled(false);
    }
  };

  const resendOtp = async () => {
    // Firebase’s resend is just sending again (rate limited)
    await requestOtp();
  };

  const onOpenChangeInternal = (open: boolean) => {
    handleOpenChange(open);

    if (!open) {
      setStep('details');
      setDisabled(false);
      setDetailsErrors({});
      setOtp('');
      setOtpError(undefined);

      confirmationResultRef.current = null;

      // reset recaptcha
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    }
  };

  return (
    <DialogWrapper
      isOpen={isOpen}
      handleOpenChange={onOpenChangeInternal}
      title={step === 'details' ? (isRegistration ? t.register : t.login) : (t?.enterOtp ?? 'Enter OTP')}
      ContentClassName='max-w-[60vh] max-h-[calc(60dvh)]'>
      {/* ✅ required for Firebase phone auth on web */}
      <div id='recaptcha-container' style={{ display: 'none' }} />

      {step === 'details' ? (
        isRegistration ? (
          <RegistrationDetailsStep
            t={t}
            loading={disabled}
            values={formData as RegistrationFormValues}
            errors={detailsErrors}
            onChange={handleChange as any}
            onClose={() => onOpenChangeInternal(false)}
            onSendOtp={requestOtp}
          />
        ) : (
          <LoginDetailsStep
            t={t}
            loading={disabled}
            values={formData}
            errors={detailsErrors}
            onChange={handleChange}
            onClose={() => onOpenChangeInternal(false)}
            onSendOtp={requestOtp}
          />
        )
      ) : (
        <LoginOtpStep
          t={t}
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
    </DialogWrapper>
  );
}
