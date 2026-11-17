import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  ShieldCheck,
  Trash2,
  Mail,
  User,
  RefreshCw,
  Check,
  X,
  Lock,
  Package,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdminRole } from '../../types';
import {
  adminRbacService,
  AuthorizedAdmin,
  PRIMARY_SUPER_ADMIN_EMAIL,
} from '../../services/adminRbacService';

type AssignableRole = 'staff' | 'admin';

const ASSIGNABLE_ROLE_LABELS: Record<AssignableRole, string> = {
  staff: 'Staff (Orders & Stock Management)',
  admin: 'Store Admin (Orders, Inventory & Finance)',
};

const ROLE_DISPLAY_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Store Admin',
  staff: 'Fulfillment Staff',
};

interface PermissionMatrixTier {
  id: AdminRole;
  title: string;
  subtitle: string;
  items: { text: string; allowed: boolean }[];
}

const ROLE_PERMISSION_MATRIX: PermissionMatrixTier[] = [
  {
    id: 'super_admin',
    title: 'Super Admin',
    subtitle: 'Primary Owner Authority',
    items: [
      { text: 'Full ERP metrics', allowed: true },
      { text: 'Order management & MFS verification', allowed: true },
      { text: 'Product catalog & inventory CRUD', allowed: true },
      { text: 'MFS Gateway settings & advance amounts', allowed: true },
      { text: 'Admin whitelist creation & revocation', allowed: true },
    ],
  },
  {
    id: 'admin',
    title: 'Store Admin',
    subtitle: 'Operations & Read-Only Governance',
    items: [
      { text: 'Full ERP metrics', allowed: true },
      { text: 'Order management & MFS verification', allowed: true },
      { text: 'Product catalog & inventory CRUD', allowed: true },
      { text: 'Read-only payment settings', allowed: true },
      { text: 'Read-only admin directory', allowed: true },
    ],
  },
  {
    id: 'staff',
    title: 'Fulfillment Staff',
    subtitle: 'Dispatch & Stock Operations',
    items: [
      { text: 'Order fulfillment & tracking assignment', allowed: true },
      { text: 'MFS Transaction ID manual check', allowed: true },
      { text: 'Quick restock & inventory viewing', allowed: true },
      { text: 'No access to payment configurations', allowed: false },
      { text: 'No access to user access control', allowed: false },
    ],
  },
];

export const AdminManagementTab: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, adminRole, addToast, language } = useApp();

  const [admins, setAdmins] = useState<AuthorizedAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  // Add Member Form State (Restricted to ONLY Staff or Store Admin)
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('staff');

  useEffect(() => {
    if (!isAdmin || adminRole === 'staff') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = adminRbacService.subscribeToAdmins((list) => {
      setAdmins(list);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, adminRole]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Read-Only Access',
        titleBn: 'শুধুমাত্র দেখার অনুমতি',
        descriptionEn: 'Only Super Admin can authorize new team members.',
      });
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      addToast({
        type: 'error',
        titleEn: 'Invalid Email Address',
        titleBn: 'ভুল ইমেইল ঠিকানা',
        descriptionEn: 'Please enter a valid email address.',
        descriptionBn: 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা প্রদান করুন।',
      });
      return;
    }

    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      addToast({
        type: 'info',
        titleEn: 'Primary Super Admin',
        titleBn: 'প্রাইমারি সুপার অ্যাডমিন',
        descriptionEn: 'This account is permanently registered as Primary Super Admin.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminRbacService.addAuthorizedAdmin(
        cleanEmail,
        newName.trim() || cleanEmail.split('@')[0],
        selectedRole,
        user?.email || PRIMARY_SUPER_ADMIN_EMAIL
      );

      addToast({
        type: 'success',
        titleEn: 'Team Member Authorized',
        titleBn: 'সদস্য যুক্ত হয়েছে',
        descriptionEn: `${cleanEmail} added as ${ASSIGNABLE_ROLE_LABELS[selectedRole]}.`,
        descriptionBn: `${cleanEmail} কে ${ROLE_DISPLAY_LABELS[selectedRole]} হিসেবে যুক্ত করা হয়েছে।`,
      });

      setNewEmail('');
      setNewName('');
      setSelectedRole('staff');
    } catch (err: any) {
      console.error('Failed to add admin:', err);
      addToast({
        type: 'error',
        titleEn: 'Failed to Authorize Member',
        titleBn: 'সদস্য যুক্ত করতে ব্যর্থ',
        descriptionEn: err?.message || 'Check Firestore security rules.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (adm: AuthorizedAdmin, nextRole: AssignableRole) => {
    if (!isSuperAdmin || adm.email === PRIMARY_SUPER_ADMIN_EMAIL) return;

    setUpdatingId(adm.id);
    try {
      await adminRbacService.updateAdmin(adm.id, { role: nextRole });
      addToast({
        type: 'success',
        titleEn: 'Role Updated',
        titleBn: 'রোল আপডেট হয়েছে',
        descriptionEn: `${adm.email} updated to ${ROLE_DISPLAY_LABELS[nextRole]}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Update Failed',
        titleBn: 'আপডেট ব্যর্থ হয়েছে',
        descriptionEn: err?.message || 'Check Firestore permissions.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async (admin: AuthorizedAdmin) => {
    if (!isSuperAdmin || admin.email === PRIMARY_SUPER_ADMIN_EMAIL) return;

    try {
      await adminRbacService.updateAdmin(admin.id, { active: !admin.active });
      addToast({
        type: 'info',
        titleEn: 'Status Updated',
        titleBn: 'স্ট্যাটাস পরিবর্তিত হয়েছে',
        descriptionEn: `${admin.email} is now ${!admin.active ? 'Active' : 'Suspended'}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Update Failed',
        titleBn: 'আপডেট ব্যর্থ',
        descriptionEn: err?.message || 'Permission denied.',
      });
    }
  };

  const handleRemoveAdmin = async (admin: AuthorizedAdmin) => {
    if (!isSuperAdmin || admin.email === PRIMARY_SUPER_ADMIN_EMAIL) return;

    try {
      await adminRbacService.removeAdmin(admin.id);
      setConfirmRevokeId(null);
      addToast({
        type: 'info',
        titleEn: 'Access Revoked',
        titleBn: 'এক্সেস বাতিল করা হয়েছে',
        descriptionEn: `${admin.email} removed from the active roster.`,
        descriptionBn: `${admin.email} কে তালিকা থেকে অপসারণ করা হয়েছে।`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Revoke',
        titleBn: 'অপসারণ ব্যর্থ',
        descriptionEn: err?.message || 'Check database permissions.',
      });
    }
  };

  // Strictly block Fulfillment Staff & non-admins from User Access Control
  if (!isAdmin || adminRole === 'staff') {
    return null;
  }

  return (
    <div id="admin-management-tab" className="space-y-6 animate-fadeIn">
      {/* Top Governance Header */}
      <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#D4AF37]">
            {isSuperAdmin ? <Crown className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{isSuperAdmin ? 'Super Admin Governance' : 'Read-Only Admin Directory'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            {language === 'bn' ? 'অ্যাডমিন ও টিম এক্সেস ম্যানেজমেন্ট' : 'Admin & Team Access Management'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
            {isSuperAdmin
              ? language === 'bn'
                ? 'অনুমোদিত স্টাফ ও স্টোর অ্যাডমিন যুক্ত করুন এবং রোল পারমিশন পরিচালনা করুন।'
                : 'Manage authorized Store Admins and Fulfillment Staff across the 3-tier access structure.'
              : language === 'bn'
              ? 'স্টোর অ্যাডমিন হিসেবে আপনি শুধুমাত্র অনুমোদিত টিম তালিকা দেখতে পারবেন।'
              : 'Viewing directory in read-only mode. Only the Super Admin can authorize or revoke access.'}
          </p>
        </div>

        <div className="px-4 py-3 rounded-xl bg-[#181A24] border border-neutral-800 text-xs space-y-0.5 shrink-0">
          <span className="text-[11px] text-neutral-400 block">Primary Owner</span>
          <span className="font-mono text-[#D4AF37] font-semibold block">
            {PRIMARY_SUPER_ADMIN_EMAIL}
          </span>
        </div>
      </div>

      {/* Authorize New Admin Form (Super Admin Only) */}
      {isSuperAdmin ? (
        <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {language === 'bn' ? 'নতুন অ্যাডমিন বা স্টাফ যোগ করুন' : 'Authorize New Team Member'}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'bn'
                  ? 'সদস্যের ইমেইল, নাম এবং Staff বা Store Admin রোল নির্বাচন করুন।'
                  : 'Assign either Staff or Store Admin privileges to an authenticated account.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="member@luxorabd.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs placeholder:text-neutral-600 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tariq Hasan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs placeholder:text-neutral-600 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Role</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs outline-none cursor-pointer"
              >
                <option value="staff">Staff (Orders &amp; Stock Management)</option>
                <option value="admin">Store Admin (Orders, Inventory &amp; Finance)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[40px] px-5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{language === 'bn' ? 'সদস্য অনুমোদন করুন' : 'Authorize Member'}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#12141A] border border-neutral-800 flex items-center gap-3 text-xs text-neutral-300">
          <Lock className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>
            Store Admins have read-only visibility into the Active Authorized Roster and Role Permission Matrix. Contact{' '}
            <span className="font-mono text-[#D4AF37]">{PRIMARY_SUPER_ADMIN_EMAIL}</span> to grant or revoke team roles.
          </span>
        </div>
      )}

      {/* Role Permission Matrix Section (3 Tiers) */}
      <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">Role Permission Matrix</h3>
            <p className="text-xs text-neutral-400">
              Standardized capability boundaries across Super Admin, Store Admin, and Fulfillment Staff.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400 tabular-nums">3 Access Tiers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLE_PERMISSION_MATRIX.map((tier) => {
            const TierIcon =
              tier.id === 'super_admin' ? Crown : tier.id === 'admin' ? ShieldCheck : Package;
            const headerAccent =
              tier.id === 'super_admin'
                ? 'text-[#D4AF37]'
                : tier.id === 'admin'
                ? 'text-sky-400'
                : 'text-amber-400';

            return (
              <div
                key={tier.id}
                className="p-5 rounded-xl bg-[#181A24] border border-neutral-800 space-y-3 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 border-b border-neutral-800/80 pb-3">
                  <div>
                    <h4 className={`text-sm font-semibold flex items-center gap-2 ${headerAccent}`}>
                      <TierIcon className="w-4 h-4 shrink-0" />
                      <span>{tier.title}</span>
                    </h4>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">{tier.subtitle}</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs">
                  {tier.items.map((item) => (
                    <li
                      key={item.text}
                      className={`flex items-start gap-2 ${
                        item.allowed ? 'text-neutral-200' : 'text-neutral-500'
                      }`}
                    >
                      {item.allowed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Authorized Roster */}
      <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-base font-semibold text-white tabular-nums">
              {language === 'bn' ? 'সক্রিয় অনুমোদিত টিম তালিকা' : 'Active Authorized Roster'} ({admins.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">/admins</span>
        </div>

        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center text-neutral-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#D4AF37]" />
            <span className="text-xs">Loading authorized roster...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] font-medium">
                  <th className="py-3 px-3">Identity</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {admins.map((adm) => {
                  const isPrimary = adm.email === PRIMARY_SUPER_ADMIN_EMAIL;
                  const isBusy = updatingId === adm.id;
                  const normalizedAssignable: AssignableRole = adm.role === 'admin' ? 'admin' : 'staff';

                  return (
                    <tr key={adm.id} className="hover:bg-[#161822]/60 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              adm.role === 'super_admin'
                                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                                : adm.role === 'admin'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isPrimary ? <Crown className="w-4 h-4" /> : adm.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{adm.name}</span>
                              {isPrimary && (
                                <span className="text-[11px] font-medium text-[#D4AF37]">
                                  · Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500">
                              Added by {adm.addedBy}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-neutral-200">{adm.email}</td>

                      <td className="py-3.5 px-3">
                        {isPrimary || adm.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]">
                            <Crown className="w-3.5 h-3.5" />
                            <span>Super Admin</span>
                          </span>
                        ) : isSuperAdmin ? (
                          <select
                            disabled={isBusy}
                            value={normalizedAssignable}
                            onChange={(e) => handleChangeRole(adm, e.target.value as AssignableRole)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#181A24] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                          >
                            <option value="staff">Staff (Orders &amp; Stock Management)</option>
                            <option value="admin">Store Admin (Orders, Inventory &amp; Finance)</option>
                          </select>
                        ) : (
                          <span
                            className={`text-xs font-medium ${
                              adm.role === 'admin' ? 'text-sky-300' : 'text-amber-300'
                            }`}
                          >
                            {ROLE_DISPLAY_LABELS[adm.role]}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            adm.active ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {adm.active ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          <span>{adm.active ? 'Active' : 'Suspended'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {isPrimary ? (
                          <span className="text-xs text-neutral-500">Protected</span>
                        ) : !isSuperAdmin ? (
                          <span className="text-xs text-neutral-500">Read-Only</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(adm)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                                adm.active
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                              }`}
                            >
                              {adm.active ? 'Suspend' : 'Activate'}
                            </button>
                            {confirmRevokeId === adm.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdmin(adm)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevokeId(null)}
                                  className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[11px] hover:bg-neutral-700 cursor-pointer whitespace-nowrap"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(adm.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Revoke access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
