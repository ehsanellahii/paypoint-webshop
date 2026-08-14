/**
 * TEMPORARY sign-in bypass.
 *
 * Google suspended the Firebase API key (`auth/permission-denied — consumer
 * api-key:… has been suspended`), so `signInWithPhoneNumber` cannot issue an SMS
 * at all. While that is the case the dialog skips Firebase entirely and accepts
 * a fixed code, so the rest of the flow — the backend login, the favourites
 * sync, the session — stays testable.
 *
 * ⚠️ THIS ACCEPTS ANY PHONE NUMBER WITH A KNOWN CODE. It is an authentication
 * bypass, not a feature. Delete this file and the `MOCK_OTP_ENABLED` branches in
 * `AuthenticationDialog` once the key is restored.
 *
 * Set `NEXT_PUBLIC_MOCK_OTP=false` to force the real Firebase path back on
 * without touching code.
 */
export const MOCK_OTP_ENABLED = process.env.NEXT_PUBLIC_MOCK_OTP !== 'false';

/** The code the mock flow accepts. Six zeros, matching the six-digit input. */
export const MOCK_OTP_CODE = '000000';
