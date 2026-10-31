import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Crown, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Mail, 
  User, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  adminRbacService, 
  AuthorizedAdmin, 
  PRIMARY_SUPER_ADMIN_EMAIL, 
  isSuperAdminEmail 
} from '../../services/adminRbacService';

export const AdminManagementTab: React.FC = () => {
  const { user, isSuperAdmin, adminRole, addToast, language } = useApp();

  const [admins, setAdmins] = useState<AuthorizedAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff'>('staff');

  // Load and subscribe to admins list from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = adminRbacService.subscribeToAdmins((list) => {
      setAdmins(list);
      setIsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Permission Denied',
        titleBn: 'অনুমতি নেই',
        descriptionEn: 'Only the primary Super Admin can authorize new administrative accounts.',
        descriptionBn: 'শুধুমাত্র সুপার অ্যাডমিন নতুন অ্যাডমিন যুক্ত করতে পারেন।',
      });
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      addToast({
        type: 'error',
        titleEn: 'Invalid Email Address',
        titleBn: 'ভুল ইমেইল ঠিকানা',
        descriptionEn: 'Please enter a valid corporate or Google account email.',
        descriptionBn: 'অনুগ্রহ করে সঠিক ইমেইল ঠিকানা প্রদান করুন।',
      });
      return;
    }

    if (cleanEmail === PRIMARY_SUPER_ADMIN_EMAIL) {
      addToast({
        type: 'info',
        titleEn: 'Primary Super Admin',
        titleBn: 'প্রাইমারি সুপার অ্যাডমিন',
        descriptionEn: 'This email is already the root owner and cannot be duplicated.',
        descriptionBn: 'এই ইমেইলটি স্থায়ীভাবে সুপার অ্যাডমিন হিসেবে সংরক্ষিত।',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await adminRbacService.addAuthorizedAdmin(
        cleanEmail,
        newName.trim() || cleanEmail.split('@')[0],
        newRole,
        user?.email || PRIMARY_SUPER_ADMIN_EMAIL
      );

      addToast({
        type: 'success',
        titleEn: 'Admin Authorized',
        titleBn: 'অ্যাডমিন যুক্ত হয়েছে',
        descriptionEn: `${cleanEmail} has been granted ${newRole.toUpperCase()} privileges.`,
        descriptionBn: `${cleanEmail} কে সফলভাবে ${newRole} অনুমোদন দেওয়া হয়েছে।`,
      });

      setNewEmail('');
      setNewName('');
      setNewRole('staff');
    } catch (err: any) {
      console.error('Failed to add admin:', err);
      addToast({
        type: 'error',
        titleEn: 'Failed to Add Admin',
        titleBn: 'অ্যাডমিন যুক্ত করতে ব্যর্থ',
        descriptionEn: err?.message || 'Check Firestore security rules and network.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AuthorizedAdmin) => {
    if (!isSuperAdmin) return;
    if (admin.email === PRIMARY_SUPER_ADMIN_EMAIL) {
      addToast({
        type: 'warning',
        titleEn: 'Permanent Privileges',
        titleBn: 'স্থায়ী অধিকার',
        descriptionEn: 'The primary Super Admin status cannot be deactivated.',
        descriptionBn: 'সুপার অ্যাডমিনের স্ট্যাটাস পরিবর্তন করা যাবে না।',
      });
      return;
    }

    try {
      await adminRbacService.updateAdmin(admin.id, { active: !admin.active });
      addToast({
        type: 'info',
        titleEn: 'Admin Status Updated',
        titleBn: 'স্ট্যাটাস পরিবর্তিত হয়েছে',
        descriptionEn: `${admin.email} is now ${!admin.active ? 'ACTIVE' : 'SUSPENDED'}.`,
        descriptionBn: `${admin.email} একাউন্টটি এখন ${!admin.active ? 'সক্রিয়' : 'স্থগিত'}।`,
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
    if (!isSuperAdmin) return;
    if (admin.email === PRIMARY_SUPER_ADMIN_EMAIL) {
      addToast({
        type: 'warning',
        titleEn: 'Protected Account',
        titleBn: 'সুরক্ষিত অ্যাকাউন্ট',
        descriptionEn: 'The primary Super Admin cannot be removed.',
        descriptionBn: 'সুপার অ্যাডমিন অ্যাকাউন্ট মুছে ফেলা সম্ভব নয়।',
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke all access for ${admin.email}?`)) {
      return;
    }

    try {
      await adminRbacService.removeAdmin(admin.id);
      addToast({
        type: 'info',
        titleEn: 'Access Revoked',
        titleBn: 'এক্সেস বাতিল করা হয়েছে',
        descriptionEn: `${admin.email} has been removed from the whitelist.`,
        descriptionBn: `${admin.email} কে অ্যাডমিন তালিকা থেকে বাদ দেওয়া হয়েছে।`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Remove',
        titleBn: 'অপসারণ ব্যর্থ',
        descriptionEn: err?.message || 'Check database permissions.',
      });
    }
  };

  return (
    <div id="admin-management-tab" className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#161822] to-[#12141A] border border-[#D4AF37]/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Corporate RBAC Governance
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Zero-Trust Whitelist
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            {language === 'bn' ? 'অ্যাডমিন ও স্টাফ পারমিশন ম্যানেজমেন্ট' : 'Enterprise Admin & Staff Directory'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            {language === 'bn'
              ? 'লাক্সোরা বিডি ইআরপিতে শুধুমাত্র অনুমোদিত ইমেইল অ্যাকাউন্ট প্রবেশ করতে পারবে। সুপার অ্যাডমিন অন্যান্য সাব-অ্যাডমিন ও কর্মচারীদের ভূমিকা নির্ধারণ করতে পারেন।'
              : 'Strict whitelist controlling access to the Luxora ERP portal. Only verified accounts can inspect orders, update stock, or view analytics.'}
          </p>
        </div>

        {/* Current User Badge */}
        <div className="p-4 rounded-xl bg-[#1A1C24] border border-neutral-800 text-xs space-y-1 relative z-10 shrink-0">
          <span className="text-[11px] text-neutral-400 block uppercase tracking-wider">Your Authority Tier:</span>
          <div className="flex items-center gap-2">
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-bold text-xs">
                <Crown className="w-3.5 h-3.5" />
                Root Super Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authorized {adminRole === 'admin' ? 'Store Admin' : 'Fulfillment Staff'}
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-neutral-300 truncate max-w-[200px]">
            {user?.email || PRIMARY_SUPER_ADMIN_EMAIL}
          </div>
        </div>
      </div>

      {/* Super Admin Privileges Section: Add New Admin Form */}
      {isSuperAdmin ? (
        <div className="p-6 rounded-2xl bg-[#12141A] border border-[#D4AF37]/20 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {language === 'bn' ? 'নতুন অ্যাডমিন বা স্টাফ যুক্ত করুন' : 'Authorize New Administrative Account'}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'bn'
                  ? 'ইমেইল অ্যাড্রেসটি ডাটাবেজে যুক্ত করলে ব্যবহারকারী লগইন করে ইআরপি ব্যবহার করতে পারবেন।'
                  : 'Grant specific role permissions to staff members to access the ERP panel.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Account Email *</span>
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@luxorabd.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs placeholder:text-neutral-600 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Full Name / Title</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Shakil Ahmed (Ops)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs placeholder:text-neutral-600 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Assigned Role *</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'staff')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A24] border border-neutral-800 focus:border-[#D4AF37] text-white text-xs outline-none transition-all cursor-pointer"
              >
                <option value="staff">Staff (Orders & Stock Management)</option>
                <option value="admin">Store Admin (Orders, Inventory & Finance)</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>Authorize Admin</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#12141A] border border-neutral-800 text-xs text-neutral-400 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            {language === 'bn' 
              ? 'শুধুমাত্র প্রাইমারি সুপার অ্যাডমিন (mdisrafilh320@gmail.com) নতুন অ্যাডমিন যোগ বা পারমিশন পরিবর্তন করতে পারবেন।'
              : 'Admin management actions are restricted to the Primary Super Admin (mdisrafilh320@gmail.com). You have read-only visibility of the team directory.'}
          </span>
        </div>
      )}

      {/* Authorized Admins List Table */}
      <div className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-base font-semibold text-white">
              {language === 'bn' ? 'অনুমোদিত অ্যাডমিন তালিকা' : 'Active Authorized Roster'} ({admins.length})
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            Database Collection: <span className="text-[#D4AF37]">/admins</span>
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
            <span className="text-xs">Loading authorized team directory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Identity</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Role Tier</th>
                  <th className="py-3 px-3">Access Status</th>
                  <th className="py-3 px-3">Authorized By</th>
                  <th className="py-3 px-3">Date Added</th>
                  {isSuperAdmin && <th className="py-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {admins.map((adm) => {
                  const isPrimary = adm.email === PRIMARY_SUPER_ADMIN_EMAIL;
                  return (
                    <tr key={adm.id} className="hover:bg-[#161822]/60 transition-colors">
                      {/* Identity */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isPrimary 
                              ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40' 
                              : adm.role === 'admin'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isPrimary ? <Crown className="w-4 h-4" /> : adm.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {adm.name}
                              {isPrimary && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono">ID: {adm.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-3 font-mono text-neutral-200">
                        {adm.email}
                      </td>

                      {/* Role Tier */}
                      <td className="py-3.5 px-3">
                        {isPrimary || adm.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                            <Crown className="w-3 h-3" />
                            Super Admin
                          </span>
                        ) : adm.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            <ShieldCheck className="w-3 h-3" />
                            Store Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <Users className="w-3 h-3" />
                            Staff
                          </span>
                        )}
                      </td>

                      {/* Access Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          adm.active 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${adm.active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {adm.active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Authorized By */}
                      <td className="py-3.5 px-3 text-neutral-400 text-[11px] font-mono">
                        {adm.addedBy}
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-3 text-neutral-400 text-[11px]">
                        {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Actions (Super Admin Only) */}
                      {isSuperAdmin && (
                        <td className="py-3.5 px-3 text-right">
                          {isPrimary ? (
                            <span className="text-[10px] text-neutral-500 italic">Root Owner</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleStatus(adm)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                                  adm.active
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                                }`}
                              >
                                {adm.active ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleRemoveAdmin(adm)}
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Revoke and delete admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Architecture Reference */}
      <div className="p-5 rounded-2xl bg-[#0E1015] border border-neutral-800 text-xs space-y-3">
        <div className="flex items-center gap-2 text-[#D4AF37] font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Role Permission Matrix</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
          <div className="p-3 rounded-xl bg-[#141620] border border-neutral-800 space-y-1">
            <span className="font-bold text-[#D4AF37] block">Super Admin ({PRIMARY_SUPER_ADMIN_EMAIL})</span>
            <ul className="text-neutral-400 space-y-0.5 list-disc list-inside">
              <li>Full ERP metrics and ledger</li>
              <li>Order management & MFS verification</li>
              <li>Product catalog & inventory CRUD</li>
              <li>MFS Gateway settings & advance amounts</li>
              <li>Admin whitelist creation & revocation</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-[#141620] border border-neutral-800 space-y-1">
            <span className="font-bold text-blue-300 block">Store Admin</span>
            <ul className="text-neutral-400 space-y-0.5 list-disc list-inside">
              <li>Full ERP metrics and ledger</li>
              <li>Order management & MFS verification</li>
              <li>Product catalog & inventory CRUD</li>
              <li>Read-only payment settings</li>
              <li>Read-only admin directory</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-[#141620] border border-neutral-800 space-y-1">
            <span className="font-bold text-emerald-300 block">Fulfillment Staff</span>
            <ul className="text-neutral-400 space-y-0.5 list-disc list-inside">
              <li>Order fulfillment & tracking assignment</li>
              <li>MFS Transaction ID manual check</li>
              <li>Quick restock & inventory viewing</li>
              <li>No access to payment configurations</li>
              <li>No access to user access control</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
