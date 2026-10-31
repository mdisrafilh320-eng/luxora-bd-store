import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertOctagon, 
  ArrowLeft, 
  LogIn, 
  Mail, 
  ShieldAlert, 
  LogOut, 
  RefreshCw,
  Sparkles,
  Key
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRIMARY_SUPER_ADMIN_EMAIL } from '../../services/adminRbacService';
import { AdminERPView } from './AdminERPView';

export const AdminAccessGate: React.FC = () => {
  const { 
    user, 
    isLoggedIn, 
    isAuthLoading, 
    isAdmin, 
    isSuperAdmin,
    isCheckingAdminStatus, 
    refreshAdminStatus, 
    signInWithGoogle, 
    setIsAuthModalOpen, 
    logout, 
    setActiveView, 
    language 
  } = useApp();

  const handleReturnToStore = () => {
    try {
      if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
        window.history.pushState({ view: 'store' }, '', window.location.pathname);
      }
    } catch {}
    setActiveView('store');
  };

  // 1. Loading State
  if (isAuthLoading || isCheckingAdminStatus) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center p-6 text-white">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-[#D4AF37] animate-ping opacity-20" />
        </div>
        <h2 className="text-xl font-display font-semibold text-[#FAF9F6] tracking-wide mb-2">
          {language === 'bn' ? 'সিকিউরিটি ক্রেডেনশিয়াল যাচাই করা হচ্ছে...' : 'Verifying Security Credentials...'}
        </h2>
        <p className="text-xs text-neutral-400 max-w-sm text-center">
          {language === 'bn' 
            ? 'লাক্সোরা বিডি এন্টারপ্রাইজ ডেটাবেজে আপনার অ্যাডমিন অনুমোদন ও ভূমিকা যাচাই করা হচ্ছে।'
            : 'Authorizing identity against encrypted enterprise access control lists.'}
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State (Not logged in or guest session)
  if (!isLoggedIn || !user || user.isGuest) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#FAF9F6] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-[#0F1117] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Badge & Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#996515]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              <Key className="w-3 h-3" />
              Restricted Corporate Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              {language === 'bn' ? 'অ্যাডমিন অথেনটিকেশন আবশ্যক' : 'Staff Authentication Required'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
              {language === 'bn'
                ? 'লাক্সোরা ইআরপি পোর্টালটি শুধুমাত্র অনুমোদিত অ্যাডমিনিস্ট্রেটর ও কর্মচারীদের জন্য সংরক্ষিত। অনুগ্রহ করে অনুমোদিত ইমেইল দিয়ে সাইন ইন করুন।'
                : 'The Luxora BD Executive ERP Portal is protected by Zero-Trust RBAC. Unauthenticated URL access is prohibited.'}
            </p>
          </div>

          {/* Security Policy Notice Box */}
          <div className="p-4 rounded-xl bg-[#141722] border border-neutral-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Route Protection Enforced</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Access attempts without verified administrative tokens are logged. If you are an authorized manager, sign in below.
            </p>
          </div>

          {/* Auth Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={signInWithGoogle}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-100 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{language === 'bn' ? 'গুগল দিয়ে সাইন ইন করুন' : 'Sign In with Authorized Google Account'}</span>
            </button>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-[#1A1C24] text-neutral-200 hover:text-white hover:bg-[#232632] border border-neutral-800 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <span>{language === 'bn' ? 'ইমেইল ও পাসওয়ার্ড দিয়ে লগইন' : 'Sign In with Admin Email & Password'}</span>
            </button>
          </div>

          {/* Super Admin Contact & Return to Store */}
          <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
            <button
              onClick={handleReturnToStore}
              className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'bn' ? 'গ্রাহক স্টোরে ফিরে যান' : 'Return to Customer Store'}</span>
            </button>
            <span className="text-[11px] text-neutral-400">
              Primary Super Admin: <span className="text-[#D4AF37] font-mono">{PRIMARY_SUPER_ADMIN_EMAIL}</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated but Unauthorized State (User is logged in, but not an admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#FAF9F6] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-lg bg-[#0F1117] border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Warning Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
              403 Access Denied
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              {language === 'bn' ? 'অননুমোদিত অ্যাকাউন্ট' : 'Unauthorized Account'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
              {language === 'bn'
                ? 'আপনার অ্যাকাউন্টটিতে লাক্সোরা বিডি এন্টারপ্রাইজ ইআরপি পোর্টালে প্রবেশের কোনো অ্যাডমিনিস্ট্রেটিভ পারমিশন নেই।'
                : 'Your authenticated account is not authorized to access the Luxora ERP control center.'}
            </p>
          </div>

          {/* User Account Info Card */}
          <div className="p-4 rounded-xl bg-[#141722] border border-neutral-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span>Signed In As:</span>
              <span className="text-white font-medium">{user.name || 'Customer'}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Email:</span>
              <span className="font-mono text-[#D4AF37]">{user.email || 'No email attached'}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Current Role:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-800 text-neutral-300">
                {user.role || 'customer'}
              </span>
            </div>
          </div>

          {/* Whitelist Request Instructions */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
            <p className="font-semibold text-amber-300">How to get authorization:</p>
            <p className="text-[11px] leading-relaxed">
              To obtain access, request authorization from the primary Super Admin (<span className="font-mono text-white underline">{PRIMARY_SUPER_ADMIN_EMAIL}</span>). They must add your email to the database admin whitelist.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => refreshAdminStatus()}
              className="w-full py-3 px-4 rounded-xl bg-[#1A1C24] hover:bg-[#232632] border border-neutral-800 text-neutral-200 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
              <span>{language === 'bn' ? 'অনুমোদন রিফ্রেশ করুন' : 'Recheck Authorization Status'}</span>
            </button>

            <button
              onClick={async () => {
                await logout();
                handleReturnToStore();
              }}
              className="w-full py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>{language === 'bn' ? 'লগআউট করে অন্য অ্যাকাউন্টে প্রবেশ' : 'Sign Out & Switch Account'}</span>
            </button>
          </div>

          {/* Return to store button */}
          <div className="pt-4 border-t border-neutral-800/80 text-center">
            <button
              onClick={handleReturnToStore}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'bn' ? 'গ্রাহক স্টোরে ফিরে যান' : 'Return to Customer Store'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin / Super Admin: Render the full ERP View!
  return <AdminERPView />;
};
