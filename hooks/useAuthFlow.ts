'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '~/contexts/language-context';
import { splitPhone } from '~/lib/phone';

import { loginSchema, phoneSchema, registrationSchema, RegistrationFormValues, type LoginFormValues } from '~/components/dialogs/Authentication/auth.schema';
import { z } from 'zod';


// ✅ your firebase auth instance (already setup by you)
import { appleProvider, auth, googleProvider } from '~/lib/firebase';

import { RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, type ConfirmationResult } from 'firebase/auth';
import { loginOrRegisterUser, loginUserWithProvider, registerUser, syncFavorites } from '~/lib/api';
import { useStore } from '~/contexts/store-context';
import { useUser, type StoredUser } from '~/contexts/user-context';
import { getFavoriteIds, setFavoritesFromIds } from '~/lib/favorites';
import { apiErrorText } from '~/lib/errorMessages';

/*
 * Firebase's own refusals, in the shop's language. Firebase writes its
 * messages in English for developers; the customer gets a sentence, and the
 * code stays appended for whoever has to debug a report.
 */
const FIREBASE_TEXTS: Record<string, { de: string; en: string }> = {
  invalidPhone: { de: 'Diese Telefonnummer sieht nicht richtig aus.', en: 'That phone number does not look right.' },
  tooMany: { de: 'Zu viele Versuche. Bitte warte ein paar Minuten und versuche es dann erneut.', en: 'Too many attempts. Please wait a few minutes and try again.' },
  smsUnavailable: { de: 'SMS können gerade nicht verschickt werden. Bitte versuche es später noch einmal.', en: 'SMS sending is currently unavailable. Please try again later.' },
  smsRegion: { de: 'SMS in dieses Land sind noch nicht freigeschaltet. Bitte nutze eine andere Nummer oder melde dich beim Restaurant.', en: 'SMS to this country is not enabled yet. Please try another number or contact us.' },
  providerOff: { de: 'Diese Anmeldeart ist für diese Seite nicht aktiviert.', en: 'This sign-in method is not enabled for this site.' },
  domain: { de: 'Diese Seite ist für die Anmeldung nicht freigegeben.', en: 'This domain is not authorised for sign-in.' },
  captcha: { de: 'Die Prüfung ist fehlgeschlagen. Bitte versuche es noch einmal.', en: 'Verification failed. Please try again.' },
  otherProvider: { de: 'Diese E-Mail ist schon mit einer anderen Anmeldeart verknüpft. Bitte nutze die, mit der du dich registriert hast.', en: 'This email is already linked to a different sign-in method. Please use the one you signed up with.' },
  popup: { de: 'Dein Browser hat das Anmeldefenster blockiert. Bitte erlaube Pop-ups und versuche es erneut.', en: 'Your browser blocked the sign-in window. Please allow pop-ups and try again.' },
  sendFailed: { de: 'Der Code konnte nicht gesendet werden. Bitte versuche es noch einmal.', en: 'Failed to send the code. Please try again.' },
  socialFailed: { de: 'Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.', en: 'Sign-in did not work. Please try again.' },
  wrongCode: { de: 'Der Code ist falsch. Bitte versuche es noch einmal.', en: 'Invalid code. Please try again.' },
  codeExpired: { de: 'Der Code ist abgelaufen. Bitte fordere einen neuen an.', en: 'The code has expired. Please request a new one.' },
};

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
  // Firebase's own `message` already reads "Firebase: Error (auth/…)", so
  // appending would print the code twice.
  if (!code || message.includes(code)) return message;
  return `${message} (${code})`;
}

function describeAuthError(
  e: { code?: string; message?: string },
  language: string,
  provider: 'phone' | 'google' | 'apple' = 'phone',
) {
  const say = (key: keyof typeof FIREBASE_TEXTS) => FIREBASE_TEXTS[key][language === 'en' ? 'en' : 'de'];

  switch (e?.code) {
    case 'auth/invalid-phone-number':
      return withCode(say('invalidPhone'), e?.code);
    case 'auth/too-many-requests':
      return withCode(say('tooMany'), e?.code);
    case 'auth/quota-exceeded':
    case 'auth/billing-not-enabled':
      return withCode(say('smsUnavailable'), e?.code);
    /*
     * Firebase returns this one code for two unrelated causes: the provider is
     * switched off, or the SMS region policy does not allow the number's
     * country. Only the message distinguishes them, and sending someone to the
     * provider toggle when the real block is the region list wastes a lot of
     * time.
     */
    case 'auth/operation-not-allowed':
      if (/region/i.test(e?.message ?? '')) {
        return withCode(say('smsRegion'), e?.code);
      }
      return withCode(say('providerOff'), e?.code);
    case 'auth/unauthorized-domain':
      return withCode(say('domain'), e?.code);
    case 'auth/captcha-check-failed':
      return withCode(say('captcha'), e?.code);
    /*
     * The same address already signed in through another provider. Firebase
     * refuses to guess which identity is meant, and the customer cannot tell
     * from the raw code what to do about it.
     */
    case 'auth/account-exists-with-different-credential':
      return withCode(say('otherProvider'), e?.code);
    case 'auth/popup-blocked':
      return withCode(say('popup'), e?.code);
    default:
      // Never Firebase's or the server's English message — the code is enough for debugging.
      return withCode(say(provider === 'phone' ? 'sendFailed' : 'socialFailed'), e?.code);
  }
}

/**
 * A refusal from our own server during sign-in (0051 codes such as
 * AUTH_TOKEN_INVALID or AUTH_PHONE_MISMATCH), in the shop's language.
 */
function describeBackendError(e: any, language: string) {
  const code = e?.code ?? e?.errorCode;
  return apiErrorText(typeof code === 'string' && !code.startsWith('auth/') ? code : undefined, language, 'auth');
}

/** Errors thrown by our API carry an HTTP status; Firebase's carry an `auth/…` code. */
const isBackendError = (e: any) => typeof e?.status === 'number';


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
  const { t, language } = useLanguage();
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
      if (!recaptchaVerifierRef.current) return;
      try {
        recaptchaVerifierRef.current.clear();
      } catch {}
      recaptchaVerifierRef.current = null;
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

  /**
   * Retire the current verifier.
   *
   * A reCAPTCHA token may be redeemed once. The instance was cached and only
   * discarded when a send failed, so the *second* send in a session — a resend,
   * or another go after fixing a number — handed Firebase a token it had
   * already consumed and came back `auth/invalid-app-credential`. Called after
   * every attempt now, successful or not, so each request builds a fresh one.
   */
  const clearRecaptcha = () => {
    if (!recaptchaVerifierRef.current) return;
    try {
      recaptchaVerifierRef.current.clear();
    } catch {}
    recaptchaVerifierRef.current = null;
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
      console.error('[auth] signInWithPhoneNumber failed', e?.code);
      setSendError(describeAuthError(e, language));
    } finally {
      // Whether it worked or not — see `clearRecaptcha`.
      clearRecaptcha();
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

      const cred = await confirmationResult.confirm(parsed.data.otp);

      /*
       * The proof the server needs (0051): Firebase's ID token for the number
       * the SMS just verified. The number sent alongside is the one Firebase
       * verified, in its own E.164 form, so the two always match.
       */
      const idToken = await cred.user.getIdToken();
      const verifiedPhone = cred.user.phoneNumber || normalizedPhone;
      let user = null;
      if (isRegistration) {
        user = await registerUser(adminId, storeId, apiKey, (formData as RegistrationFormValues).customerName.trim(), verifiedPhone, idToken);
      } else {
        // Signing in and registering are the same errand here: the OTP just
        // proved the number, so an unknown one means a first-time customer.
        user = await loginOrRegisterUser(adminId, storeId, apiKey, verifiedPhone, formData.customerName?.trim(), idToken);
      }
      await finishLogin(user);
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (isBackendError(e)) {
        setOtpError(describeBackendError(e, language));
      } else if (code === 'auth/invalid-verification-code') {
        setOtpError(withCode(FIREBASE_TEXTS.wrongCode[language === 'en' ? 'en' : 'de'], code));
      } else if (code === 'auth/code-expired') {
        setOtpError(withCode(FIREBASE_TEXTS.codeExpired[language === 'en' ? 'en' : 'de'], code));
      } else {
        setOtpError(withCode(apiErrorText(undefined, language, 'auth'), code));
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
  const finishLogin = async (raw: any) => {
    /*
     * Only a customer object with its token becomes a session — and only the
     * whitelisted fields of it (see `sanitizeUser`).
     */
    const session: StoredUser | null = setUser(raw);
    if (!session) throw Object.assign(new Error('AUTH_TOKEN_INVALID'), { status: 401, code: 'AUTH_TOKEN_INVALID' });
    handleOpenChange(false);
    try {
      const slug = storeInfo?.slug || '';
      const localIds = getFavoriteIds(slug);
      const res = await syncFavorites(adminId, storeId, apiKey, session._id, localIds, session.authToken);
      setFavoritesFromIds(slug, res?.productIds ?? []);
    } catch {
      // Favourites stay local; signing in does not fail over them.
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

      // The server checks this token's verified e-mail against `email` (0051).
      const idToken = await credential.user.getIdToken();
      const user = await loginUserWithProvider(adminId, storeId, apiKey, {
        email,
        name: credential.user.displayName ?? undefined,
        provider: providerName,
        idToken,
      });
      await finishLogin(user);
    } catch (e: any) {
      // Closing the popup is a choice, not a fault — say nothing.
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return;
      console.error('[auth] social sign-in failed', e?.code);
      setSendError(isBackendError(e) ? describeBackendError(e, language) : describeAuthError(e, language, providerName));
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
