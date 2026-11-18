import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import rawFirebaseConfig from '../../firebase-applet-config.json';

// Dynamically resolve configuration supporting Vercel/Netlify environments & custom domains
const env = (import.meta as any)?.env || {};

const defaultProjectId = env.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId || 'focused-stack-7j1d7';
const defaultAuthDomain = 
  env.VITE_FIREBASE_AUTH_DOMAIN || 
  rawFirebaseConfig.authDomain ||
  `${defaultProjectId}.firebaseapp.com`;

export const resolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: defaultAuthDomain,
  projectId: defaultProjectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId
};

export const firebaseConfig = resolvedFirebaseConfig;

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(resolvedFirebaseConfig) : getApp();

// Initialize Auth with graceful fallback for Safari ITP / Private mode / restricted WebViews
export const auth = getAuth(app);
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch (err) {
        console.warn('Firebase auth persistence fallback warning:', err);
      }
    }
  }
})();

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

export function isFirestoreQuotaOrOfflineError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('unavailable') ||
    message.includes('quota') ||
    message.includes('resource-exhausted') ||
    message.includes('client is offline') ||
    message.includes('network')
  );
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
 * Validate Firestore cloud availability on application boot
 * against publicly readable settings/return_policy doc without triggering unauthorized reads.
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }
    const probe = getDocFromServer(doc(db, 'settings', 'return_policy'));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    await Promise.race([probe, timeout]);
    return Boolean(db);
  } catch (error) {
    if (isFirestoreQuotaOrOfflineError(error)) {
      console.warn('Firestore server probe offline/quota notice:', error);
      return false;
    }
    return Boolean(db);
  }
}

export default app;
