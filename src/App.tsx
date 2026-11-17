import React, { Suspense, lazy, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { BottomNav } from './components/common/BottomNav';
import { TrustBadges } from './components/common/TrustBadges';
import { HeroBanner } from './components/store/HeroBanner';
import { CatalogHub } from './components/store/CatalogHub';
import { CartDrawer } from './components/store/CartDrawer';
import { WishlistDrawer } from './components/store/WishlistDrawer';
import { ProductDetailModal } from './components/store/ProductDetailModal';
import { ReturnPolicyModal } from './components/store/ReturnPolicyModal';
import { AuthModal } from './components/store/AuthModal';
import { AccountView } from './components/store/AccountView';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { CourierTrackingView } from './components/tracking/CourierTrackingView';
import { CustomerSupportHub } from './components/support/CustomerSupportHub';
import { AIAssistantWidget } from './components/support/AIAssistantWidget';
import { ToastContainer } from './components/ui/ToastContainer';
import { getProductById } from './services/productService';
import {
  extractProductIdFromUrl,
  updateProductOpenGraphMeta,
} from './services/shareService';

// Code-split admin and internal design-system bundles so regular shoppers never download admin dashboards/APIs
const AdminAccessGate = lazy(() =>
  import('./components/admin/AdminAccessGate').then((mod) => ({ default: mod.AdminAccessGate }))
);
const DesignSystemExplorer = lazy(() =>
  import('./components/design-system/DesignSystemExplorer').then((mod) => ({
    default: mod.DesignSystemExplorer,
  }))
);

const isAdminUrlPath = (): boolean => {
  try {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = (urlParams.get('view') || '').toLowerCase();
    const adminParam = (urlParams.get('admin') || '').toLowerCase();

    return (
      pathname === '/admin' ||
      pathname.startsWith('/admin/') ||
      hash === '#admin' ||
      hash.startsWith('#/admin') ||
      hash.startsWith('#admin/') ||
      viewParam === 'admin' ||
      adminParam === 'true'
    );
  } catch {
    return false;
  }
};

const MainStoreContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    trackingOrderId,
    isAdmin,
    isLoggedIn,
    user,
    isAuthLoading,
    isCheckingAdminStatus,
    addToast,
    setIsAuthModalOpen,
    products,
    quickViewProduct,
    setQuickViewProduct,
    language,
  } = useApp();

  const lastDeniedUrlNoticeRef = useRef<number>(0);
  const wasQuickViewOpenRef = useRef<boolean>(false);
  const lastResolvedDeepLinkIdRef = useRef<string | null>(null);
  const productsRef = useRef(products);
  productsRef.current = products;

  // Resolve a deep-linked product (/product/{id} or ?product={id}) directly from catalog or Firestore
  const openDeepLinkedProduct = useCallback(async (productId: string) => {
    const cleanId = productId.trim();
    if (!cleanId) return;

    // 1. Fast match from in-memory catalog if already loaded
    const inMemoryMatch = productsRef.current.find(
      (p) => p.id === cleanId || p.id.replace(/[^a-zA-Z0-9_.@-]/g, '_') === cleanId
    );
    if (inMemoryMatch) {
      lastResolvedDeepLinkIdRef.current = inMemoryMatch.id;
      setActiveView('store');
      setQuickViewProduct(inMemoryMatch);
      return;
    }

    // 2. Direct Firestore document lookup so shared links work instantaneously regardless of pagination/load state
    try {
      const fetched = await getProductById(cleanId);
      if (fetched) {
        lastResolvedDeepLinkIdRef.current = fetched.id;
        setActiveView('store');
        setQuickViewProduct(fetched);
      } else {
        addToast({
          type: 'warning',
          titleEn: 'Product Not Found',
          titleBn: 'পণ্যটি খুঁজে পাওয়া যায়নি',
          descriptionEn: 'The shared product link may have expired or been removed.',
          descriptionBn: 'শেয়ার করা পণ্যের লিংকটি বর্তমানে উপলব্ধ নয়।',
        });
        try {
          window.history.replaceState({ view: 'store' }, '', '/');
        } catch {}
      }
    } catch {
      addToast({
        type: 'warning',
        titleEn: 'Unable to Load Product',
        titleBn: 'পণ্য লোড করা যায়নি',
        descriptionEn: 'Could not retrieve the shared product details.',
        descriptionBn: 'শেয়ার করা পণ্যের তথ্য লোড করা সম্ভব হয়নি।',
      });
      try {
        window.history.replaceState({ view: 'store' }, '', '/');
      } catch {}
    }
  }, [setActiveView, setQuickViewProduct, addToast]);

  // Detect direct URL path / hash / query navigation on load and browser Back/Forward events
  useEffect(() => {
    const handleUrlRoute = () => {
      try {
        const pathname = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const trackParam = urlParams.get('track');
        const viewParam = (urlParams.get('view') || '').toLowerCase();
        const deepLinkProductId = extractProductIdFromUrl();

        if (isAdminUrlPath()) {
          setActiveView('admin');
        } else if (deepLinkProductId) {
          void openDeepLinkedProduct(deepLinkProductId);
        } else if (
          pathname === '/track' ||
          hash === '#track' ||
          hash === '#/track' ||
          trackParam ||
          viewParam === 'track'
        ) {
          setActiveView('track');
        } else if (
          pathname === '/support' ||
          hash === '#support' ||
          hash === '#/support' ||
          viewParam === 'support'
        ) {
          setActiveView('support');
        } else if (
          pathname === '/account' ||
          hash === '#account' ||
          hash === '#/account' ||
          viewParam === 'account'
        ) {
          setActiveView('account');
        } else if (
          pathname === '/checkout' ||
          hash === '#checkout' ||
          hash === '#/checkout' ||
          viewParam === 'checkout'
        ) {
          setActiveView('checkout');
        } else if (
          pathname === '/design-system' ||
          hash === '#design-system' ||
          hash === '#/design-system' ||
          viewParam === 'design-system'
        ) {
          setActiveView('design-system');
        } else {
          // Returning to storefront root via browser Back button closes any open product modal cleanly
          if (wasQuickViewOpenRef.current) {
            setQuickViewProduct(null);
          }
        }
      } catch {
        // ignore
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, [setActiveView, setQuickViewProduct, openDeepLinkedProduct]);

  // Synchronize Open Graph Meta Tags + canonical /product/{id} URL whenever quickViewProduct opens or closes
  useEffect(() => {
    updateProductOpenGraphMeta(quickViewProduct, language);

    try {
      if (quickViewProduct) {
        wasQuickViewOpenRef.current = true;
        const targetPath = `/product/${encodeURIComponent(quickViewProduct.id)}`;
        const currentDeepLinkId = extractProductIdFromUrl();
        if (currentDeepLinkId !== quickViewProduct.id) {
          window.history.pushState({ productId: quickViewProduct.id }, '', targetPath);
        }
      } else if (wasQuickViewOpenRef.current) {
        wasQuickViewOpenRef.current = false;
        if (extractProductIdFromUrl()) {
          window.history.replaceState({ view: activeView }, '', '/');
        }
      }
    } catch {
      // ignore history errors inside sandboxed iframes
    }
  }, [quickViewProduct, language, activeView]);

  // Strict Route-Level RBAC Enforcement:
  // If an unauthenticated visitor or non-admin user tries to access /admin (or design-system),
  // immediately redirect to the home page (or prompt sign-in) with an "Access Denied" notice.
  useEffect(() => {
    if (isAuthLoading || isCheckingAdminStatus) return;

    const attemptingAdminRoute = activeView === 'admin' || isAdminUrlPath();
    const attemptingInternalDesignRoute = activeView === 'design-system';

    if ((attemptingAdminRoute || attemptingInternalDesignRoute) && !isAdmin) {
      const now = Date.now();
      if (now - lastDeniedUrlNoticeRef.current > 1200) {
        lastDeniedUrlNoticeRef.current = now;
        addToast({
          type: 'error',
          titleEn: 'Access Denied',
          titleBn: 'অ্যাক্সেস ডিনাইড',
          descriptionEn:
            !isLoggedIn || user?.isGuest
              ? 'Access Denied — Sign in with an authorized administrator account.'
              : 'Access Denied — You do not have permission to open the Admin Panel.',
          descriptionBn:
            !isLoggedIn || user?.isGuest
              ? 'অ্যাক্সেস ডিনাইড — অনুগ্রহ করে অনুমোদিত অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।'
              : 'অ্যাক্সেস ডিনাইড — অ্যাডমিন প্যানেলে প্রবেশের অনুমতি আপনার নেই।',
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
  }, [
    activeView,
    isAdmin,
    isLoggedIn,
    user,
    isAuthLoading,
    isCheckingAdminStatus,
    addToast,
    setActiveView,
    setIsAuthModalOpen,
  ]);

  // Sync activeView to browser URL hash/path ONLY for verified admins
  useEffect(() => {
    try {
      if (activeView === 'admin' && isAdmin) {
        if (!window.location.pathname.startsWith('/admin') && window.location.hash !== '#admin') {
          window.history.pushState({ view: 'admin' }, '', '#admin');
        }
      } else if (activeView === 'store' && isAdminUrlPath()) {
        window.history.replaceState({ view: 'store' }, '', '/');
      }
    } catch {}
  }, [activeView, isAdmin]);

  if (activeView === 'admin') {
    if (isAuthLoading || isCheckingAdminStatus) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-xs text-neutral-400">
          Verifying administrator privileges...
        </div>
      );
    }
    if (!isAdmin) {
      return null;
    }
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#08090C] flex items-center justify-center text-xs text-neutral-400">
            Loading Admin Workspace...
          </div>
        }
      >
        <AdminAccessGate />
      </Suspense>
    );
  }

  if (activeView === 'design-system') {
    if (!isAdmin) {
      return null;
    }
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#08090C] flex items-center justify-center text-xs text-neutral-400">
            Loading Design Tokens...
          </div>
        }
      >
        <DesignSystemExplorer />
      </Suspense>
    );
  }

  if (activeView === 'account') {
    return <AccountView />;
  }

  if (activeView === 'checkout') {
    return <CheckoutPage />;
  }

  if (activeView === 'track') {
    return <CourierTrackingView initialOrderId={trackingOrderId || undefined} />;
  }

  if (activeView === 'support') {
    return <CustomerSupportHub />;
  }

  return (
    <main className="w-full max-w-full overflow-x-clip pb-20 md:pb-0">
      {/* 1. Full-Width Auto-Sliding Promotional Hero Banner */}
      <HeroBanner />

      {/* 2. Minimal Luxury Trust Badge Strip */}
      <TrustBadges variant="minimal" />

      {/* 3. Search Bar, Dynamic Category Filter Bar & Minimalist Luxury Product Grid */}
      <CatalogHub />
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen max-w-full overflow-x-clip bg-[#0A0A0C] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black relative">
        {/* Navigation Header */}
        <Header />

        {/* Dynamic Main Body Content */}
        <MainStoreContent />

        {/* Global Modals & Drawers */}
        <CartDrawer />
        <WishlistDrawer />
        <ProductDetailModal />
        <ReturnPolicyModal />
        <AuthModal />
        <ToastContainer />

        {/* AI Customer Support Concierge Floating Widget */}
        <AIAssistantWidget />

        {/* Mobile Sticky Bottom Navigation */}
        <BottomNav />

        {/* Editorial Footer */}
        <Footer />
      </div>
    </AppProvider>
  );
}
