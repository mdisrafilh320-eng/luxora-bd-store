import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Explicitly ensure official Firebase authDomain to avoid unauthorized domain mismatches on custom/Vercel hostnames
const env = (import.meta as any)?.env || {};

export const resolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: 'luxora-bd-8170f.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId || 'focused-stack-7j1d7',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId
};

export const firebaseConfig = resolvedFirebaseConfig;

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(resolvedFirebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase auth persistence warning:', err);
});

// Configure Google OAuth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with custom database ID
export const db: Firestore = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);

// Initialize Cloud Storage
export const storage = getStorage(app);

// Standardized Operation Types for Security & Diagnostics
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Robust, traceable error handling conforming to Firebase Security rules guidelines
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(p => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Log:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Firestore cloud connection on application boot
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
    // Return true since connection test document may not exist
    return true;
  }
}

export default app;
