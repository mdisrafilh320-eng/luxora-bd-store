/**
 * Luxora BD - Standard Role-Based Access Control (RBAC) Service
 * Clean 3-role structure:
 *   - super_admin: Primary Owner / Super Admin (full control over store, payment settings & team access)
 *   - admin: Store Admin / Supervisor (orders, inventory, CMS, finance, omnichannel & read-only payment settings)
 *   - staff: Fulfillment Staff (order status, courier tracking & stock management)
 *
 * Primary Super Admin: mdisrafilh320@gmail.com
 */

import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminRole } from '../types';

export const PRIMARY_SUPER_ADMIN_EMAIL = 'mdisrafilh320@gmail.com';

export type { AdminRole };

export interface AuthorizedAdmin {
  id: string; // Canonical lowercase email or UID
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
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole | 'none';
  adminInfo?: AuthorizedAdmin;
}

export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function isSuperAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === PRIMARY_SUPER_ADMIN_EMAIL;
}

export function normalizeAdminRole(rawRole?: unknown, email?: string | null): AdminRole {
  if (isSuperAdminEmail(email)) return 'super_admin';
  const r = String(rawRole || '').toLowerCase().trim();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'admin' || r === 'store_admin' || r === 'supervisor') return 'admin';
  return 'staff';
}

const DEFAULT_SUPER_ADMIN: AuthorizedAdmin = {
  id: PRIMARY_SUPER_ADMIN_EMAIL,
  email: PRIMARY_SUPER_ADMIN_EMAIL,
  name: 'Md Israfil (Founder & Super Admin)',
  role: 'super_admin',
  active: true,
  addedBy: 'System Bootstrap',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function mapFirestoreAdminDoc(id: string, data: any): AuthorizedAdmin {
  const email = normalizeEmail(data?.email || id);
  const role = normalizeAdminRole(data?.role, email);
  const active = email === PRIMARY_SUPER_ADMIN_EMAIL ? true : data?.active !== false;

  return {
    id,
    uid: data?.uid,
    email,
    name: data?.name || data?.email || 'Admin User',
    role,
    active,
    addedBy: data?.addedBy || 'System',
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt,
  };
}

function isValidFirestoreDocId(id: string): boolean {
  return Boolean(id) && id.length <= 128 && /^[a-zA-Z0-9_.@-]+$/.test(id);
}

async function readDocPreferServer(ref: ReturnType<typeof doc>, forceServer: boolean) {
  if (!forceServer) return getDoc(ref);
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

export const adminRbacService = {
  async verifyAdminAccess(
    email?: string | null,
    uid?: string | null,
    options: { forceServer?: boolean } = {}
  ): Promise<AdminAccessStatus> {
    const cleanEmail = normalizeEmail(email);
    const forceServer = Boolean(options.forceServer);

    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      this.ensureSuperAdminDocument(cleanEmail, uid).catch(() => {});
      return {
        isAdmin: true,
        isSuperAdmin: true,
        role: 'super_admin',
        adminInfo: DEFAULT_SUPER_ADMIN,
      };
    }

    if (!cleanEmail && !uid) {
      return {
        isAdmin: false,
        isSuperAdmin: false,
        role: 'none',
      };
    }

    try {
      if (cleanEmail && isValidFirestoreDocId(cleanEmail)) {
        const emailSnap = await readDocPreferServer(doc(db, 'admins', cleanEmail), forceServer);
        if (emailSnap.exists()) {
          const entry = mapFirestoreAdminDoc(emailSnap.id, emailSnap.data());
          if (!entry.active) {
            return { isAdmin: false, isSuperAdmin: false, role: 'none' };
          }
          return {
            isAdmin: true,
            isSuperAdmin: entry.role === 'super_admin',
            role: entry.role,
            adminInfo: entry,
          };
        }
      }

      if (uid && isValidFirestoreDocId(uid)) {
        const uidSnap = await readDocPreferServer(doc(db, 'admins', uid), forceServer);
        if (uidSnap.exists()) {
          const entry = mapFirestoreAdminDoc(uidSnap.id, uidSnap.data());
          if (!entry.active) {
            return { isAdmin: false, isSuperAdmin: false, role: 'none' };
          }
          return {
            isAdmin: true,
            isSuperAdmin: entry.role === 'super_admin',
            role: entry.role,
            adminInfo: entry,
          };
        }
      }

      return { isAdmin: false, isSuperAdmin: false, role: 'none' };
    } catch (error) {
      console.warn('Failed to verify admin status against Firestore:', error);
      return { isAdmin: false, isSuperAdmin: false, role: 'none' };
    }
  },

  /**
   * Real-time per-user admin role listener.
   * Ensures role promotions, suspensions, and revocations propagate immediately
   * across every open browser/device without requiring manual reload or logout.
   */
  subscribeToUserAdminAccess(
    email: string | null | undefined,
    uid: string | null | undefined,
    onUpdate: (status: AdminAccessStatus) => void
  ): () => void {
    const cleanEmail = normalizeEmail(email);
    const cleanUid = (uid || '').trim();

    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      this.ensureSuperAdminDocument(cleanEmail, cleanUid).catch(() => {});
      onUpdate({
        isAdmin: true,
        isSuperAdmin: true,
        role: 'super_admin',
        adminInfo: DEFAULT_SUPER_ADMIN,
      });
      return () => {};
    }

    if (!cleanEmail && !cleanUid) {
      onUpdate({ isAdmin: false, isSuperAdmin: false, role: 'none' });
      return () => {};
    }

    const unsubs: Array<() => void> = [];
    let emailStatus: AdminAccessStatus | null = null;
    let uidStatus: AdminAccessStatus | null = null;

    const emitResolved = () => {
      if (emailStatus && emailStatus.isAdmin) {
        onUpdate(emailStatus);
        return;
      }
      if (uidStatus && uidStatus.isAdmin) {
        onUpdate(uidStatus);
        return;
      }
      if (emailStatus !== null || uidStatus !== null) {
        onUpdate({ isAdmin: false, isSuperAdmin: false, role: 'none' });
      }
    };

    if (cleanEmail && isValidFirestoreDocId(cleanEmail)) {
      try {
        const unsubEmail = onSnapshot(
          doc(db, 'admins', cleanEmail),
          (snap) => {
            if (snap.exists()) {
              const entry = mapFirestoreAdminDoc(snap.id, snap.data());
              emailStatus = entry.active
                ? {
                    isAdmin: true,
                    isSuperAdmin: entry.role === 'super_admin',
                    role: entry.role,
                    adminInfo: entry,
                  }
                : { isAdmin: false, isSuperAdmin: false, role: 'none' };
            } else {
              emailStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
            }
            emitResolved();
          },
          (err) => {
            console.warn('[RBAC] Email admin listener warning:', err);
            emailStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
            emitResolved();
          }
        );
        unsubs.push(unsubEmail);
      } catch {
        emailStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
      }
    } else {
      emailStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
    }

    if (cleanUid && isValidFirestoreDocId(cleanUid) && cleanUid !== cleanEmail) {
      try {
        const unsubUid = onSnapshot(
          doc(db, 'admins', cleanUid),
          (snap) => {
            if (snap.exists()) {
              const entry = mapFirestoreAdminDoc(snap.id, snap.data());
              uidStatus = entry.active
                ? {
                    isAdmin: true,
                    isSuperAdmin: entry.role === 'super_admin',
                    role: entry.role,
                    adminInfo: entry,
                  }
                : { isAdmin: false, isSuperAdmin: false, role: 'none' };
            } else {
              uidStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
            }
            emitResolved();
          },
          () => {
            uidStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
            emitResolved();
          }
        );
        unsubs.push(unsubUid);
      } catch {
        uidStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
      }
    } else {
      uidStatus = { isAdmin: false, isSuperAdmin: false, role: 'none' };
    }

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  },

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
      console.warn('ensureSuperAdminDocument warning:', e);
    }
  },

  async getAuthorizedAdmins(): Promise<AuthorizedAdmin[]> {
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const list: AuthorizedAdmin[] = [];
      let foundPrimary = false;

      snap.forEach((d) => {
        const entry = mapFirestoreAdminDoc(d.id, d.data());
        if (entry.email === PRIMARY_SUPER_ADMIN_EMAIL) {
          foundPrimary = true;
        }
        list.push(entry);
      });

      if (!foundPrimary) {
        list.unshift(DEFAULT_SUPER_ADMIN);
      }

      return list;
    } catch (error) {
      console.warn('Error reading admins collection:', error);
      return [DEFAULT_SUPER_ADMIN];
    }
  },

  subscribeToAdmins(callback: (admins: AuthorizedAdmin[]) => void): () => void {
    try {
      const unsub = onSnapshot(
        collection(db, 'admins'),
        (snap) => {
          const list: AuthorizedAdmin[] = [];
          let foundPrimary = false;

          snap.forEach((d) => {
            const entry = mapFirestoreAdminDoc(d.id, d.data());
            if (entry.email === PRIMARY_SUPER_ADMIN_EMAIL) {
              foundPrimary = true;
            }
            list.push(entry);
          });

          if (!foundPrimary) {
            list.unshift(DEFAULT_SUPER_ADMIN);
          }

          callback(list);
        },
        (err) => {
          console.warn('Admins snapshot subscription error:', err);
          callback([DEFAULT_SUPER_ADMIN]);
        }
      );

      return unsub;
    } catch {
      callback([DEFAULT_SUPER_ADMIN]);
      return () => {};
    }
  },

  async addAuthorizedAdmin(
    email: string,
    name: string,
    role: AdminRole,
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

  async removeAdmin(adminId: string): Promise<void> {
    const cleanId = normalizeEmail(adminId);
    if (cleanId === PRIMARY_SUPER_ADMIN_EMAIL) {
      throw new Error('Primary Super Admin account cannot be deleted.');
    }

    const docRef = doc(db, 'admins', cleanId);
    await deleteDoc(docRef);
  },
};
