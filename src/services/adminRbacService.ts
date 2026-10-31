/**
 * Luxora BD - Enterprise Role-Based Access Control (RBAC) Service
 * Manages authorized administrator and staff accounts with strict multi-tier permissions.
 * Primary Super Admin: mdisrafilh320@gmail.com
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'mdisrafilh320@gmail.com';

export type AdminRole = 'super_admin' | 'admin' | 'staff';

export interface AuthorizedAdmin {
  id: string; // Normalized email or UID
  uid?: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  addedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAccessStatus {
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  role: AdminRole | 'none';
  adminInfo?: AuthorizedAdmin;
}

/**
 * Normalizes email address for canonical indexing and comparison
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Checks if an email is the primary Super Admin
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === PRIMARY_SUPER_ADMIN_EMAIL;
}

/**
 * Default fallback entry for Primary Super Admin
 */
const DEFAULT_SUPER_ADMIN: AuthorizedAdmin = {
  id: PRIMARY_SUPER_ADMIN_EMAIL,
  email: PRIMARY_SUPER_ADMIN_EMAIL,
  name: 'Md Israfil (Founder & Super Admin)',
  role: 'super_admin',
  active: true,
  addedBy: 'System Bootstrap',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const adminRbacService = {
  /**
   * Verify if a user with given email / uid is authorized for Admin ERP access
   */
  async verifyAdminAccess(email?: string | null, uid?: string | null): Promise<AdminAccessStatus> {
    const cleanEmail = normalizeEmail(email);

    // Primary Super Admin check (Always privileged)
    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      // Auto-ensure Super Admin doc exists in Firestore in background
      this.ensureSuperAdminDocument(cleanEmail, uid).catch(() => {});
      return {
        isAuthorized: true,
        isSuperAdmin: true,
        role: 'super_admin',
        adminInfo: DEFAULT_SUPER_ADMIN,
      };
    }

    if (!cleanEmail && !uid) {
      return { isAuthorized: false, isSuperAdmin: false, role: 'none' };
    }

    try {
      // 1. Check document by email ID
      if (cleanEmail) {
        const emailDocRef = doc(db, 'admins', cleanEmail);
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists()) {
          const data = emailSnap.data() as AuthorizedAdmin;
          if (data.active !== false) {
            return {
              isAuthorized: true,
              isSuperAdmin: data.role === 'super_admin',
              role: data.role || 'staff',
              adminInfo: { id: emailSnap.id, ...data },
            };
          }
        }
      }

      // 2. Check document by UID
      if (uid) {
        const uidDocRef = doc(db, 'admins', uid);
        const uidSnap = await getDoc(uidDocRef);
        if (uidSnap.exists()) {
          const data = uidSnap.data() as AuthorizedAdmin;
          if (data.active !== false) {
            return {
              isAuthorized: true,
              isSuperAdmin: data.role === 'super_admin',
              role: data.role || 'staff',
              adminInfo: { id: uidSnap.id, ...data },
            };
          }
        }
      }

      // 3. Fallback: Query collection by email field
      if (cleanEmail) {
        const q = query(collection(db, 'admins'), where('email', '==', cleanEmail));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const firstDoc = querySnap.docs[0];
          const data = firstDoc.data() as AuthorizedAdmin;
          if (data.active !== false) {
            return {
              isAuthorized: true,
              isSuperAdmin: data.role === 'super_admin',
              role: data.role || 'staff',
              adminInfo: { id: firstDoc.id, ...data },
            };
          }
        }
      }

      return { isAuthorized: false, isSuperAdmin: false, role: 'none' };
    } catch (error) {
      console.warn('Failed to verify admin status against Firestore:', error);
      return { isAuthorized: false, isSuperAdmin: false, role: 'none' };
    }
  },

  /**
   * Automatically initializes the Super Admin document in Firestore if not yet populated
   */
  async ensureSuperAdminDocument(email: string, uid?: string | null): Promise<void> {
    try {
      const docRef = doc(db, 'admins', email);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          email,
          uid: uid || '',
          name: 'Md Israfil',
          role: 'super_admin',
          active: true,
          addedBy: 'Root Security Authority',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Non-blocking
      console.warn('ensureSuperAdminDocument warning:', e);
    }
  },

  /**
   * Retrieve the list of all authorized admin and staff users
   */
  async getAuthorizedAdmins(): Promise<AuthorizedAdmin[]> {
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const list: AuthorizedAdmin[] = [];
      let foundPrimary = false;

      snap.forEach((d) => {
        const data = d.data() as AuthorizedAdmin;
        const entry: AuthorizedAdmin = {
          id: d.id,
          email: normalizeEmail(data.email || d.id),
          name: data.name || data.email || 'Admin',
          role: data.role || 'staff',
          active: data.active !== false,
          addedBy: data.addedBy || 'System',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          uid: data.uid,
        };

        if (entry.email === PRIMARY_SUPER_ADMIN_EMAIL) {
          entry.role = 'super_admin';
          entry.active = true;
          foundPrimary = true;
        }
        list.push(entry);
      });

      // Always ensure Primary Super Admin is at the top of the list
      if (!foundPrimary) {
        list.unshift(DEFAULT_SUPER_ADMIN);
      }

      return list;
    } catch (error) {
      console.warn('Error reading admins collection:', error);
      return [DEFAULT_SUPER_ADMIN];
    }
  },

  /**
   * Subscribe to real-time changes of the authorized admins list
   */
  subscribeToAdmins(callback: (admins: AuthorizedAdmin[]) => void): () => void {
    try {
      const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
        const list: AuthorizedAdmin[] = [];
        let foundPrimary = false;

        snap.forEach((d) => {
          const data = d.data() as AuthorizedAdmin;
          const entry: AuthorizedAdmin = {
            id: d.id,
            email: normalizeEmail(data.email || d.id),
            name: data.name || data.email || 'Admin',
            role: data.role || 'staff',
            active: data.active !== false,
            addedBy: data.addedBy || 'System',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
            uid: data.uid,
          };

          if (entry.email === PRIMARY_SUPER_ADMIN_EMAIL) {
            entry.role = 'super_admin';
            entry.active = true;
            foundPrimary = true;
          }
          list.push(entry);
        });

        if (!foundPrimary) {
          list.unshift(DEFAULT_SUPER_ADMIN);
        }

        callback(list);
      }, (err) => {
        console.warn('Admins snapshot subscription error:', err);
        callback([DEFAULT_SUPER_ADMIN]);
      });

      return unsub;
    } catch {
      callback([DEFAULT_SUPER_ADMIN]);
      return () => {};
    }
  },

  /**
   * Add a new authorized admin or staff member (Only executable by Super Admin)
   */
  async addAuthorizedAdmin(
    email: string, 
    name: string, 
    role: 'admin' | 'staff', 
    addedBy: string
  ): Promise<AuthorizedAdmin> {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      throw new Error('Primary Super Admin is already permanently registered.');
    }

    const docRef = doc(db, 'admins', cleanEmail);
    const newAdmin: AuthorizedAdmin = {
      id: cleanEmail,
      email: cleanEmail,
      name: name.trim() || cleanEmail.split('@')[0],
      role,
      active: true,
      addedBy: addedBy || PRIMARY_SUPER_ADMIN_EMAIL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, newAdmin);
    return newAdmin;
  },

  /**
   * Update an existing admin's active status or role
   */
  async updateAdmin(
    adminId: string, 
    updates: Partial<Pick<AuthorizedAdmin, 'role' | 'active' | 'name'>>
  ): Promise<void> {
    const cleanId = normalizeEmail(adminId);
    if (cleanId === PRIMARY_SUPER_ADMIN_EMAIL) {
      throw new Error('Primary Super Admin privileges cannot be modified or suspended.');
    }

    const docRef = doc(db, 'admins', cleanId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Permanently remove an authorized admin from the whitelist
   */
  async removeAdmin(adminId: string): Promise<void> {
    const cleanId = normalizeEmail(adminId);
    if (cleanId === PRIMARY_SUPER_ADMIN_EMAIL) {
      throw new Error('Primary Super Admin account cannot be deleted.');
    }

    const docRef = doc(db, 'admins', cleanId);
    await deleteDoc(docRef);
  }
};
