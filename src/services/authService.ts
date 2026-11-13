import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  fetchSignInMethodsForEmail,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  MembershipTier,
  Language,
  SavedDeliveryInfo,
  UserAddress,
} from '../types';

const USERS_COLLECTION = 'users';
const SUPER_ADMIN_EMAIL = 'mdisrafilh320@gmail.com';

// Prevents race condition between registerWithEmail() and onAuthStateChanged() listener
const pendingRegistrationSyncs = new Map<string, Promise<UserProfile>>();

export function getPendingRegistrationSync(uid: string): Promise<UserProfile> | undefined {
  return pendingRegistrationSyncs.get(uid);
}

export interface AccountExistenceResult {
  existsInAuth: boolean;
  existsInFirestore: boolean;
  signInMethods: string[];
}

/**
 * Inspect whether an email already exists in Firebase Auth and/or Firestore (`users`).
 * Handles Firestore permission-denied gracefully for unauthenticated sign-up attempts.
 */
export async function inspectExistingAccount(email: string): Promise<AccountExistenceResult> {
  const cleanEmail = email.trim().toLowerCase();
  let signInMethods: string[] = [];
  let existsInAuth = false;
  let existsInFirestore = false;

  // 1. Check Firebase Auth sign-in methods
  try {
    signInMethods = await fetchSignInMethodsForEmail(auth, cleanEmail);
    existsInAuth = Array.isArray(signInMethods) && signInMethods.length > 0;
  } catch {
    // Email enumeration protection or network check failed; caller still knows from auth error code
  }

  // 2. Check Firestore users collection (gracefully skip if list rule denies unauthenticated list)
  try {
    if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
      const ownSnap = await getDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid));
      if (ownSnap.exists()) {
        existsInFirestore = true;
      }
    }
    if (!existsInFirestore) {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', cleanEmail),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        existsInFirestore = true;
      }
    }
  } catch {
    // Expected when unauthenticated due to PII protection on users list queries
  }

  return {
    existsInAuth,
    existsInFirestore,
    signInMethods,
  };
}

/**
 * Retrieve user profile from Firestore (`users/{uid}`)
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Create or sync user profile in Firestore (`users/{uid}`)
 */
export async function syncUserProfile(
  user: FirebaseUser,
  additionalData: Partial<UserProfile> = {}
): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  try {
    const existing = await getDoc(userRef);
    const now = new Date().toISOString();

    const isAdminUser = (user.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
    const role: UserRole = isAdminUser ? 'admin' : (additionalData.role || 'customer');

    let profile: UserProfile;

    if (!existing.exists()) {
      profile = {
        id: user.uid,
        name: additionalData.name || user.displayName || 'Luxora Member',
        email: user.email || additionalData.email || '',
        phoneNumber: additionalData.phoneNumber || user.phoneNumber || '',
        photoURL: user.photoURL || '',
        role,
        membershipTier: (additionalData.membershipTier as MembershipTier) || 'Standard',
        language: (additionalData.language as Language) || 'en',
        points: 100, // Welcome loyalty points
        savedAddresses: additionalData.savedAddresses || [],
        isGuest: false,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, profile);
    } else {
      const data = existing.data() as UserProfile;
      profile = {
        ...data,
        name: additionalData.name || data.name || user.displayName || 'Luxora Member',
        email: user.email || data.email || '',
        phoneNumber: data.phoneNumber || additionalData.phoneNumber || user.phoneNumber || '',
        photoURL: user.photoURL || data.photoURL || '',
        isGuest: false,
        updatedAt: now,
      };
      const updatePayload: Record<string, unknown> = {
        name: profile.name,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        photoURL: profile.photoURL,
        updatedAt: now,
      };
      if (isAdminUser && data.role !== 'admin') {
        profile.role = 'admin';
        updatePayload.role = 'admin';
      }
      await updateDoc(userRef, updatePayload);
    }

    try {
      localStorage.setItem('luxora_user', JSON.stringify(profile));
    } catch {
      // ignore storage errors
    }

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${user.uid}`);
  }
}

/**
 * Save/Update Customer Name, Phone, Optional Email & Full Delivery Address
 * inside `users/{userId}` in Firestore for 1-click repeat orders.
 */
export async function saveUserCheckoutProfile(
  uid: string,
  info: Omit<SavedDeliveryInfo, 'updatedAt'>
): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const now = new Date().toISOString();

  const deliveryInfo: SavedDeliveryInfo = {
    fullName: info.fullName.trim(),
    phoneNumber: info.phoneNumber.trim(),
    email: (info.email || '').trim(),
    division: info.division.trim(),
    divisionName: info.divisionName.trim(),
    district: info.district.trim(),
    districtName: info.districtName.trim(),
    upazila: info.upazila.trim(),
    detailedAddress: info.detailedAddress.trim(),
    updatedAt: now,
  };

  const primaryAddress: UserAddress = {
    id: 'default',
    title: 'Primary Delivery Address',
    recipientName: deliveryInfo.fullName,
    phoneNumber: deliveryInfo.phoneNumber,
    email: deliveryInfo.email,
    division: deliveryInfo.division,
    divisionName: deliveryInfo.divisionName,
    district: deliveryInfo.district,
    districtName: deliveryInfo.districtName,
    upazila: deliveryInfo.upazila,
    addressLine: deliveryInfo.detailedAddress,
    isDefault: true,
  };

  try {
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const existingData = snap.data() as UserProfile;
      const otherAddresses = (existingData.savedAddresses || []).filter(
        (addr) => addr.id !== 'default'
      );
      const updatedAddresses = [primaryAddress, ...otherAddresses];
      const nextEmail = existingData.email || deliveryInfo.email || auth.currentUser?.email || '';

      // Note: Do NOT touch `role` on update so firestore.rules owner-update passes strictly
      await updateDoc(userRef, {
        name: deliveryInfo.fullName,
        phoneNumber: deliveryInfo.phoneNumber,
        ...(nextEmail ? { email: nextEmail } : {}),
        defaultDeliveryInfo: deliveryInfo,
        savedAddresses: updatedAddresses,
        updatedAt: now,
      });

      const updatedProfile: UserProfile = {
        ...existingData,
        name: deliveryInfo.fullName,
        phoneNumber: deliveryInfo.phoneNumber,
        email: nextEmail,
        defaultDeliveryInfo: deliveryInfo,
        savedAddresses: updatedAddresses,
        updatedAt: now,
      };

      try {
        localStorage.setItem('luxora_user', JSON.stringify(updatedProfile));
      } catch {
        // ignore
      }

      return updatedProfile;
    } else {
      const currentAuthUser = auth.currentUser;
      const resolvedEmail = currentAuthUser?.email || deliveryInfo.email || '';
      const isAdminUser = resolvedEmail.toLowerCase() === SUPER_ADMIN_EMAIL;

      const newProfile: UserProfile = {
        id: uid,
        name: deliveryInfo.fullName,
        email: resolvedEmail,
        phoneNumber: deliveryInfo.phoneNumber,
        photoURL: currentAuthUser?.photoURL || '',
        role: isAdminUser ? 'admin' : 'customer',
        membershipTier: 'Standard',
        language: 'en',
        points: 100,
        defaultDeliveryInfo: deliveryInfo,
        savedAddresses: [primaryAddress],
        isGuest: false,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userRef, newProfile);

      try {
        localStorage.setItem('luxora_user', JSON.stringify(newProfile));
      } catch {
        // ignore
      }

      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * 1. Email/Password Sign-In
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const profile = await syncUserProfile(cred.user);
  return profile;
}

/**
 * 2. Email/Password Registration
 */
export async function registerWithEmail(
  name: string,
  email: string,
  pass: string,
  language: Language = 'en'
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const uid = cred.user.uid;

    const syncPromise = (async () => {
      await updateProfile(cred.user, { displayName: cleanName });
      return await syncUserProfile(cred.user, {
        name: cleanName,
        language,
        role: cred.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'customer',
      });
    })();

    pendingRegistrationSyncs.set(uid, syncPromise);
    try {
      const profile = await syncPromise;
      return profile;
    } finally {
      pendingRegistrationSyncs.delete(uid);
    }
  } catch (error: any) {
    if (error?.code === 'auth/email-already-in-use') {
      const inspection = await inspectExistingAccount(cleanEmail);
      const enrichedError: any = new Error(
        error?.message || 'An account already exists with this email address.'
      );
      enrichedError.code = 'auth/email-already-in-use';
      enrichedError.email = cleanEmail;
      enrichedError.signInMethods = inspection.signInMethods;
      enrichedError.existsInAuth = true; // Confirmed by createUserWithEmailAndPassword rejection
      enrichedError.existsInFirestore = inspection.existsInFirestore;
      throw enrichedError;
    }
    throw error;
  }
}

/**
 * 3. Google Sign-In (Popup with Redirect fallback if blocked)
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const profile = await syncUserProfile(cred.user, {
      role: cred.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'customer',
    });
    return profile;
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || '';
      const err: any = new Error(
        `এই ইমেইল (${email || 'Gmail'}) দিয়ে ইতিপূর্বেই পাসওয়ার্ড অ্যাকাউন্ট খোলা রয়েছে। অনুগ্রহ করে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।`
      );
      err.code = 'auth/account-exists-with-different-credential';
      throw err;
    } else if (error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
}

/**
 * Check for pending Google redirect result on app initialization
 */
export async function checkRedirectResult(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await syncUserProfile(result.user, {
        role: result.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? 'admin' : 'customer',
      });
    }
  } catch (error) {
    console.warn('[Firebase Auth] Redirect result check notice:', error);
  }
  return null;
}

/**
 * 4. User Logout
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout error:', err);
  }
  try {
    localStorage.removeItem('luxora_user');
    localStorage.removeItem('luxora_guest_session');
  } catch {
    // ignore
  }
}

/**
 * 5. Password Reset
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Global Auth State Listener
 */
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
