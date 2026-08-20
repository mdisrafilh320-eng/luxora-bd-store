import { 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserAddress } from '../types';

const USERS_COLLECTION = 'users';

/**
 * Fetch profile data for a specific user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${userId}`);
  }
}

/**
 * Update general profile fields
 */
export async function updateUserProfile(
  userId: string, 
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

/**
 * Add or update a saved delivery address
 */
export async function saveAddress(
  userId: string, 
  address: UserAddress
): Promise<UserAddress[]> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    let currentAddresses = profile.savedAddresses || [];
    const index = currentAddresses.findIndex(a => a.id === address.id);

    if (address.isDefault) {
      currentAddresses = currentAddresses.map(a => ({ ...a, isDefault: false }));
    }

    if (index >= 0) {
      currentAddresses[index] = address;
    } else {
      currentAddresses.push(address);
    }

    await updateUserProfile(userId, { savedAddresses: currentAddresses });
    return currentAddresses;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${userId}/savedAddresses`);
  }
}

/**
 * Remove a saved address from profile
 */
export async function removeAddress(
  userId: string, 
  addressId: string
): Promise<UserAddress[]> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    const updated = (profile.savedAddresses || []).filter(a => a.id !== addressId);
    await updateUserProfile(userId, { savedAddresses: updated });
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${userId}/savedAddresses`);
  }
}
