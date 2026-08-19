'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '~/contexts/language-context';
import { splitPhone } from '~/lib/phone';

import { loginSchema, phoneSchema, registrationSchema, RegistrationFormValues, type LoginFormValues } from '~/components/dialogs/Authentication/auth.schema';
import { z } from 'zod';


// ✅ your firebase auth instance (already setup by you)
import { appleProvider, auth, googleProvider } from '~/lib/firebase';

import { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, type ConfirmationResult } from 'firebase/auth';
import { loginUser, loginUserWithProvider, registerUser, syncFavorites } from '~/lib/api';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { getFavoriteIds, setFavoritesFromIds } from '~/lib/favorites';

/**
 * Turn a Firebase auth error into something a customer can act on.
 *
 * Several codes are shared across providers but need different wording:
 * `auth/operation-not-allowed` means "this provider is switched off in the
 * Firebase console", so naming the wrong one sends whoever is debugging it to
 * the wrong settings page.
 */
/**
 * Append the provider's own error code to a message.
 *
 * The sentence tells the customer what to do; the code tells whoever is
 * debugging which of several causes it actually was — `auth/quota-exceeded` and
 * `auth/billing-not-enabled` read identically to a customer but need completely
 * different fixes. It used to be visible only in the browser console, which
 * meant reproducing the failure just to identify it, and made a customer's
 * report ("it says try again later") impossible to act on.
 */
function withCode(message: string, code?: string) {
  return code ? `${message} (${code})` : message;
}

function describeAuthError(
  e: { code?: string; message?: string },
  t: Partial<Record<'invalidPhone' | 'otpSendFailed', string>>,
  provider: 'phone' | 'google' | 'apple' = 'phone',
) {
  const providerName = provider === 'phone' ? 'Phone' : provider === 'google' ? 'Google' : 'Apple';

  switch (e?.code) {
    case 'auth/invalid-phone-number':
      return withCode(t?.invalidPhone ?? 'That phone number does not look right.', e?.code);
    case 'auth/too-many-requests':
      return withCode('Too many attempts. Please wait a few minutes and try again.', e?.code);
    case 'auth/quota-exceeded':
    case 'auth/billing-not-enabled':
      return withCode('SMS sending is currently unavailable. Please try again later.', e?.code);
    /*
     * Firebase returns this one code for two unrelated causes: the provider is
     * switched off, or the SMS region policy does not allow the number's
     * country. Only the message distinguishes them, and sending someone to the
     * provider toggle when the real block is the region list wastes a lot of
     * time.
     */
    case 'auth/operation-not-allowed':
      if (/region/i.test(e?.message ?? '')) {
        return withCode('SMS to this country is not enabled yet. Please try another number or contact us.', e?.code);
      }
      return withCode(`${providerName} sign-in is not enabled for this site.`, e?.code);
    case 'auth/unauthorized-domain':
      return withCode('This domain is not authorised for sign-in.', e?.code);
    case 'auth/captcha-check-failed':
      return withCode('Verification failed. Please try again.', e?.code);
    /*
     * The same address already signed in through another provider. Firebase
     * refuses to guess which identity is meant, and the customer cannot tell
     * from the raw code what to do about it.
     */
    case 'auth/account-exists-with-different-credential':
      return withCode('This email is already linked to a different sign-in method. Please use the one you signed up with.', e?.code);
    case 'auth/popup-blocked':
      return withCode('Your browser blocked the sign-in window. Please allow pop-ups and try again.', e?.code);
    default:
      if (provider !== 'phone') return withCode(e?.message || `${providerName} sign-in failed. Please try again.`, e?.code);
      return withCode(e?.message || t?.otpSendFailed || 'Failed to send OTP. Please try again.', e?.code);
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
export function useAuthFlow({
  handleOpenChange,
  isRegistration = false,
  initialPhone,
  initialName,
  phoneOnly = false,
}: {
  handleOpenChange: (open: boolean) => void;
  isRegistration?: boolean;
  /**
   * Seed the phone field — checkout already asked for the number, so the
   * verification step should not ask for it a second time.
   */
  initialPhone?: string;
  /** Seed the name, so the account still gets one without a second field. */
  initialName?: string;
  /** Validate the number alone: no name field is on screen to fill in. */
  phoneOnly?: boolean;
}) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { setUser } = useUser();
  const adminId = storeInfo?.adminId || '';
  const storeId = storeInfo?.storeId || '';
  const apiKey = storeInfo?.apiKey || '';
  const [step, setStep] = useState<Step>('details');
  const [disabled, setDisabled] = useState(false);

  const [formData, setFormData] = useState<LoginFormValues | RegistrationFormValues>(() => {
    const seeded = splitPhone(initialPhone);
    return { customerName: initialName?.trim() ?? '', phoneCode: seeded.code, phoneNumber: seeded.number };
  });

  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [sendError, setSendError] = useState<string | undefined>(undefined);

  // ✅ Keep firebase confirmation result (needed for verify)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // ✅ Keep recaptcha verifier instance so we don’t recreate repeatedly
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  /*
   * Release the reCAPTCHA widget if the screen goes away without passing
   * through the close handler — a browser back gesture on mobile, where this is
   * a route rather than a dialog. grecaptcha keeps a global registry keyed on
   * the element, so an abandoned widget is worth clearing explicitly.
   */
  useEffect(
    () => () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }
    },
    [],
  );

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
    const schema = phoneOnly ? phoneSchema : isRegistration ? registrationSchema : loginSchema;
    const result = schema.safeParse(formData);
    if (result.success) {
      setDetailsErrors({});
      return { ok: true as const };
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

      const verifier = setupRecaptcha();

      // ✅ Send SMS OTP
      const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);

      confirmationResultRef.current = confirmationResult;
      setStep('otp');
    } catch (e: any) {
      // common firebase errors: auth/invalid-phone-number, auth/too-many-requests,
      // auth/unauthorized-domain, auth/billing-not-enabled, auth/operation-not-allowed.
      console.error('[auth] signInWithPhoneNumber failed', e?.code, e?.message, e);
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
    if (!confirmationResult) {
      setOtpError(t?.otpSessionExpired ?? 'OTP session expired. Please resend OTP.');
      return;
    }

    try {
      setDisabled(true);
      setOtpError(undefined);

      await confirmationResult.confirm(parsed.data.otp);

      // ✅ Firebase token (send to your backend if you want to create/update user)
      // const idToken = await cred.user.getIdToken();
      let user = null;
      if (isRegistration) {
        user = await registerUser(adminId, storeId, apiKey, (formData as RegistrationFormValues).customerName.trim(), normalizedPhone);
      } else {
        user = await loginUser(adminId, storeId, apiKey, normalizedPhone, formData.customerName?.trim());
      }
      handleOpenChange(false);
      if (user) setUser(user);
      try {
        const slug = storeInfo?.slug; // IMPORTANT: use same key you store favorites under
        const localIds = getFavoriteIds(slug!);

        const res = await syncFavorites(adminId, storeId, apiKey, user._id, localIds);

        const finalIds: string[] = res?.productIds ?? [];
        setFavoritesFromIds(slug!, finalIds);
      } catch (e) {
        console.error('Favorites sync after auth failed:', e);
      }
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (code === 'auth/invalid-verification-code') {
        setOtpError(withCode(t?.invalidOtp ?? 'Invalid OTP. Please try again.', code));
      } else if (code === 'auth/code-expired') {
        setOtpError(withCode(t?.otpExpired ?? 'OTP expired. Please resend.', code));
      } else {
        setOtpError(withCode(e?.message || t?.otpVerifyFailed || 'Failed to verify OTP.', code));
      }
    } finally {
      setDisabled(false);
    }
  };

  const resendOtp = async () => {
    // Firebase’s resend is just sending again (rate limited)
    await requestOtp();
  };

  /**
   * Everything that has to happen after any successful sign-in: adopt the
   * customer and fold the guest's local favourites into their account. Shared
   * so the social paths cannot drift from the phone path.
   */
  const finishLogin = async (user: any) => {
    handleOpenChange(false);
    if (user) setUser(user);
    try {
      const slug = storeInfo?.slug;
      const localIds = getFavoriteIds(slug!);
      const res = await syncFavorites(adminId, storeId, apiKey, user._id, localIds);
      setFavoritesFromIds(slug!, res?.productIds ?? []);
    } catch (e) {
      console.error('Favorites sync after auth failed:', e);
    }
  };

  /**
   * Google and Apple, via a popup.
   *
   * The backend identifies a customer by phone or email, and these providers
   * never return a phone number — so the address is what ties the account to a
   * customer record. Apple in particular only releases the address on the very
   * first authorisation, and only if the customer does not hide it, which is why
   * a missing email is reported rather than silently creating a guest.
   */
  const signInWithProvider = async (providerName: 'google' | 'apple') => {
    setSendError(undefined);
    setDisabled(true);
    try {
      const provider = providerName === 'google' ? googleProvider : appleProvider;
      const credential = await signInWithPopup(auth, provider);
      const email = credential.user.email;

      if (!email) {
        setSendError(t?.socialNoEmail ?? 'This account did not share an email address. Please sign in with your phone number.');
        return;
      }

      const user = await loginUserWithProvider(adminId, storeId, apiKey, {
        email,
        name: credential.user.displayName ?? undefined,
        provider: providerName,
      });
      await finishLogin(user);
    } catch (e: any) {
      // Closing the popup is a choice, not a fault — say nothing.
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
      console.error('[auth] social sign-in failed', e?.code, e);
      setSendError(describeAuthError(e, t, providerName));
    } finally {
      setDisabled(false);
    }
  };

  const signInWithGoogle = () => signInWithProvider('google');
  const signInWithApple = () => signInWithProvider('apple');

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
    isRegistration, signInWithGoogle, signInWithApple,
  };
}
