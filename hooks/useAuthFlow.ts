'use client';

import { useMemo, useRef, useState } from 'react';
import { useLanguage } from '~/contexts/language-context';

import { loginSchema, registrationSchema, RegistrationFormValues, type LoginFormValues } from '~/components/dialogs/Authentication/auth.schema';
import { z } from 'zod';


// ✅ your firebase auth instance (already setup by you)
import { auth } from '~/lib/firebase';

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { loginUser, registerUser, syncFavorites } from '~/lib/api';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { getFavoriteIds, setFavoritesFromIds } from '~/lib/favorites';
import { MOCK_OTP_CODE, MOCK_OTP_ENABLED } from '~/lib/authMock';

/** Turn a Firebase auth error into something a customer can act on. */
function describeAuthError(e: { code?: string; message?: string }, t: Partial<Record<'invalidPhone' | 'otpSendFailed', string>>) {
  switch (e?.code) {
    case 'auth/invalid-phone-number':
      return t?.invalidPhone ?? 'That phone number does not look right.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/quota-exceeded':
    case 'auth/billing-not-enabled':
      return 'SMS sending is currently unavailable. Please try again later.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled for this site.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in.';
    case 'auth/captcha-check-failed':
      return 'Verification failed. Please try again.';
    default:
      return e?.message || t?.otpSendFailed || 'Failed to send OTP. Please try again.';
  }
}


type Step = 'details' | 'otp';
type DetailsErrors = Partial<Record<keyof LoginFormValues, string>>;

const otpSchema = z.object({
  otp: z.string().trim().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

/**
 * The whole phone sign-in flow: validation, the reCAPTCHA verifier, the OTP
 * request and verification, and the backend login that follows.
 *
 * Mobile shows this as a full screen and desktop as a split-panel card, but
 * neither should own a second copy of the Firebase handling or the mock bypass.
 */
export function useAuthFlow({ handleOpenChange, isRegistration = false }: { handleOpenChange: (open: boolean) => void; isRegistration?: boolean }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { setUser } = useUser();
  const adminId = storeInfo?.adminId || '';
  const storeId = storeInfo?.storeId || '';
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
  const [sendError, setSendError] = useState<string | undefined>(undefined);

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
      setSendError(undefined);

      if (MOCK_OTP_ENABLED) {
        // No SMS is sent — see lib/authMock.ts.
        console.warn('[auth] mock OTP flow active — accepting', MOCK_OTP_CODE);
        confirmationResultRef.current = null;
        setStep('otp');
        return;
      }

      const verifier = setupRecaptcha();

      // ✅ Send SMS OTP
      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);

      confirmationResultRef.current = confirmationResult;
      setStep('otp');
    } catch (e: any) {
      // common firebase errors: auth/invalid-phone-number, auth/too-many-requests,
      // auth/unauthorized-domain, auth/billing-not-enabled, auth/operation-not-allowed.
      console.error('[auth] signInWithPhoneNumber failed', e?.code, e);
      setSendError(describeAuthError(e, t));

      // A verifier that has already been used (or failed) is rejected on the next
      // call, so drop it and let the retry build a fresh one.
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
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
    if (!MOCK_OTP_ENABLED && !confirmationResult) {
      setOtpError(t?.otpSessionExpired ?? 'OTP session expired. Please resend OTP.');
      return;
    }

    try {
      setDisabled(true);
      setOtpError(undefined);

      if (MOCK_OTP_ENABLED) {
        if (parsed.data.otp !== MOCK_OTP_CODE) {
          setOtpError(t?.invalidOtp ?? 'Invalid OTP. Please try again.');
          setDisabled(false);
          return;
        }
      } else {
        // ✅ Verify code with Firebase
        await confirmationResult!.confirm(parsed.data.otp);
      }

      // ✅ Firebase token (send to your backend if you want to create/update user)
      // const idToken = await cred.user.getIdToken();
      let user = null;
      if (isRegistration) {
        user = await registerUser(adminId, storeId, (formData as RegistrationFormValues).customerName.trim(), normalizedPhone);
      } else {
        user = await loginUser(adminId, storeId, normalizedPhone, formData.customerName?.trim());
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
      setSendError(undefined);

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


  return {
    t, step, setStep, disabled, formData, detailsErrors, otp, setOtp, otpError, setOtpError,
    sendError, normalizedPhone, handleChange, requestOtp, verifyOtp, resendOtp, onOpenChangeInternal,
    isRegistration,
  };
}
