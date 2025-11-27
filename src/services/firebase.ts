import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { StoreSettings } from '@/types/store';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

export const initializeFirebase = (settings: StoreSettings) => {
  try {
    app = initializeApp(settings.firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log('Firebase initialized successfully');
    return { app, db, auth };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
};

export const getFirebaseDb = (): Firestore => {
  if (!db) {
    throw new Error('Firebase not initialized. Please complete store setup first.');
  }
  return db;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    throw new Error('Firebase not initialized. Please complete store setup first.');
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase not initialized. Please complete store setup first.');
  }
  return auth;
};

export const getGoogleProvider = (): GoogleAuthProvider => {
  if (!googleProvider) {
    throw new Error('Firebase not initialized. Please complete store setup first.');
  }
  return googleProvider;
};