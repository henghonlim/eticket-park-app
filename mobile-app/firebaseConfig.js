import { initializeApp, getApps, getApp } from 'firebase/app'; 
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'BloomFilter',
  'BloomFilterError',
  '@firebase/firestore' 
]);

const originalWarn = console.warn;
console.warn = (...args) => {
  const warnText = args.join(' ');
  if (warnText.includes('BloomFilter') || warnText.includes('BloomFilterError')) {
    return; 
  }
  originalWarn(...args); 
};

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID  
};

let app;
let auth;

if (typeof getApps !== 'undefined' && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app); 
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth, app };