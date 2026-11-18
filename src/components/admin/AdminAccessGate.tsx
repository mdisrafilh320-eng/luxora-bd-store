import React, { Suspense, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ErrorBoundary, lazyWithRetry } from '../ui/ErrorBoundary';

const LazyAdminERPView = lazyWithRetry(() =>
  import('./AdminERPView').then((mod) => ({ default: mod.AdminERPView }))
);

export const AdminAccessGate: React.FC = () => {
  const {
    user,
    isLoggedIn,
    isAuthLoading,
    isAdmin,
    isCheckingAdminStatus,
    setIsAuthModalOpen,
    setActiveView,
    addToast,
    language,
  } = useApp();

  const deniedNotifiedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading || isCheckingAdminStatus) return;

    if (!isLoggedIn || !user || user.isGuest || !isAdmin) {
      if (!deniedNotifiedRef.current) {
        deniedNotifiedRef.current = true;
        addToast({
          type: 'error',
          titleEn: 'Access Denied',
          titleBn: 'অ্যাক্সেস ডিনাইড',
          descriptionEn: !isLoggedIn || user?.isGuest
            ? 'Please sign in with an authorized administrator account.'
            : 'You do not have administrator permissions to view this area.',
          descriptionBn: !isLoggedIn || user?.isGuest
            ? 'অ্যাডমিন প্যানেলে প্রবেশ করতে অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।'
            : 'এই পেজটি দেখার জন্য আপনার অ্যাডমিন অনুমোদন নেই।',
        });
        if (!isLoggedIn || user?.isGuest) {
          setIsAuthModalOpen(true);
        }
      }
      try {
        window.history.replaceState({ view: 'store' }, '', '/');
      } catch {}
      setActiveView('store');
    }
  }, [isAuthLoading, isCheckingAdminStatus, isLoggedIn, user, isAdmin, setActiveView, setIsAuthModalOpen, addToast]);

  // Brief verification state while Firebase RBAC resolves
  if (isAuthLoading || isCheckingAdminStatus) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center p-6 text-white">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-lg font-display font-semibold text-[#FAF9F6] tracking-wide mb-1">
          {language === 'bn' ? 'অ্যাডমিন অনুমোদন যাচাই করা হচ্ছে...' : 'Verifying Administrator Privileges...'}
        </h2>
      </div>
    );
  }

  // Strictly block rendering of any Admin UI for non-admins or unauthenticated visitors
  if (!isLoggedIn || !user || user.isGuest || !isAdmin) {
    return null;
  }

  return (
    <ErrorBoundary
      compact
      fallbackTitle="Admin Workspace Error"
      onReset={() => setActiveView('store')}
    >
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#08090C] flex items-center justify-center p-6 text-xs text-neutral-400">
            {language === 'bn' ? 'অ্যাডমিন ড্যাশবোর্ড লোড হচ্ছে...' : 'Loading Admin Workspace...'}
          </div>
        }
      >
        <LazyAdminERPView />
      </Suspense>
    </ErrorBoundary>
  );
};
