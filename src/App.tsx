import React, { useEffect } from 'react';
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
import { AdminAccessGate } from './components/admin/AdminAccessGate';
import { ToastContainer } from './components/ui/ToastContainer';
import { DesignSystemExplorer } from './components/design-system/DesignSystemExplorer';

const MainStoreContent: React.FC = () => {
  const { 
    activeView, 
    language,
    setActiveView 
  } = useApp();

  // Detect direct URL path / hash / query navigation on load and route changes
  useEffect(() => {
    const handleUrlRoute = () => {
      try {
        const pathname = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const trackParam = urlParams.get('track');
        const viewParam = urlParams.get('view');
        const adminParam = urlParams.get('admin');

        if (
          pathname === '/admin' || 
          pathname.startsWith('/admin/') || 
          hash === '#admin' || 
          hash === '#/admin' || 
          viewParam === 'admin' || 
          adminParam === 'true'
        ) {
          setActiveView('admin');
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
  }, [setActiveView]);

  // Sync activeView to browser URL hash/path
  useEffect(() => {
    try {
      if (activeView === 'admin') {
        if (!window.location.pathname.startsWith('/admin') && window.location.hash !== '#admin') {
          window.history.pushState({ view: 'admin' }, '', '#admin');
        }
      } else if (activeView === 'store') {
        if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
          window.history.pushState({ view: 'store' }, '', window.location.pathname);
        }
      }
    } catch {}
  }, [activeView]);

  if (activeView === 'admin') {
    return <AdminAccessGate />;
  }

  if (activeView === 'design-system') {
    return <DesignSystemExplorer />;
  }

  if (activeView === 'account') {
    return <AccountView />;
  }

  if (activeView === 'checkout') {
    return <CheckoutPage />;
  }

  if (activeView === 'track') {
    return <CourierTrackingView />;
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
