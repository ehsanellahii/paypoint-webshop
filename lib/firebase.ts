// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyA4U2eZiLzWc8jbQdiqr7nyiC6XFVUOTSs',
  authDomain: 'paypoint-pos-842c0.firebaseapp.com',
  projectId: 'paypoint-pos-842c0',
  storageBucket: 'paypoint-pos-842c0.firebasestorage.app',
  messagingSenderId: '386988043923',
  appId: '1:386988043923:web:c584aaa4c53fe4f0ca6766',
  measurementId: 'G-CWYKG7363T',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
