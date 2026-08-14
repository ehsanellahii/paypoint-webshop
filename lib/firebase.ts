import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

/**
 * Firebase is used for customer sign-in only: phone (SMS OTP), Google and Apple.
 *
 * Every value here is public by design — a Firebase web config identifies the
 * project, it does not authorise anything. What actually protects the project is
 * the authorised-domains list and the API key restrictions in the Google Cloud
 * console, so those must be set for each domain the shop runs on.
 *
 * Read from the environment with the project's own values as the fallback, so a
 * second environment can point at its own Firebase project without a code change.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBh-7hP31Yl_CJnRnOf1mgGh3aKMCjTCHs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'paypoint-2f60f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'paypoint-2f60f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'paypoint-2f60f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1029150351468',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:1029150351468:web:53756c6550f8bbb2693849',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-RJK5NRMESG',
};

/*
 * Next renders this module on the server and again on the client, and in dev it
 * re-executes on every hot reload — initializeApp throws on the second call, so
 * reuse the existing app when there is one.
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Follow the device/browser language for the SMS and the provider consent
 * screens, rather than always sending English.
 */
auth.useDeviceLanguage();

export const googleProvider = new GoogleAuthProvider();
// Ask for the address explicitly: the backend keys a customer on phone OR email,
// and an Apple/Google account with no email cannot be matched to one.
googleProvider.addScope('email');

export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

/**
 * `getAnalytics` is deliberately not called here — it touches `window` and would
 * throw during server rendering. Load it from a client effect if it is ever
 * wanted.
 */
