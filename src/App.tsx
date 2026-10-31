import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { BottomNav } from './components/common/BottomNav';
import { TrustBadges } from './components/common/TrustBadges';
import { HeroBanner } from './components/store/HeroBanner';
import { CategoryGrid } from './components/store/CategoryGrid';
import { FeaturedShowcase } from './components/store/FeaturedShowcase';
import { CatalogHub } from './components/store/CatalogHub';
import { CartDrawer } from './components/store/CartDrawer';
import { WishlistDrawer } from './components/store/WishlistDrawer';
import { ProductDetailModal } from './components/store/ProductDetailModal';
import { AuthModal } from './components/store/AuthModal';
import { AccountView } from './components/store/AccountView';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { CourierTrackingView } from './components/tracking/CourierTrackingView';
import { CustomerSupportHub } from './components/support/CustomerSupportHub';
import { AIAssistantWidget } from './components/support/AIAssistantWidget';
import { AdminAccessGate } from './components/admin/AdminAccessGate';
import { ToastContainer } from './components/ui/ToastContainer';
import { SectionHeader } from './components/ui/SectionHeader';
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
    <main className="w-full max-w-full overflow-x-hidden pb-16 md:pb-0">
      {/* 1. Minimalist Luxury Hero Section */}
      <HeroBanner />

      {/* 2. Top Trust Badges Bar */}
      <TrustBadges variant="bar" />

      {/* 3. Curated Category Domains Grid */}
      <CategoryGrid />

      {/* 4. Flagship Spotlight & Tabbed Showcase */}
      <FeaturedShowcase />

      {/* 5. Complete Minimalist Catalog Hub with Filters & Sorting */}
      <CatalogHub />

      {/* 6. Comprehensive Trust & Credibility Section */}
      <section className="bg-[#08080A] border-t border-[#1E1E24] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge={language === 'bn' ? 'আমাদের প্রতিশ্রুতি' : 'THE LUXORA PROMISE'}
            title={language === 'bn' ? 'বিশ্বস্ততা ও ১০০% অথেনটিসিটি' : 'Uncompromising Authenticity & Care'}
            subtitle={language === 'bn' 
              ? 'বাংলাদেশের গ্রাহকদের জন্য সম্পূর্ণ ঝুঁকিমুক্ত শপিং ও ২৪-৪৮ ঘণ্টায় ক্যাশ অন ডেলিভারি সার্ভিস।'
              : 'Engineered for seamless doorstep commerce across all 64 districts in Bangladesh.'}
            align="center"
          />
          <TrustBadges variant="grid" />
        </div>
      </section>
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen max-w-full overflow-x-hidden bg-[#0A0A0C] text-[#F3F4F6] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black relative">
        {/* Navigation Header */}
        <Header />

        {/* Dynamic Main Body Content */}
        <MainStoreContent />

        {/* Global Modals & Drawers */}
        <CartDrawer />
        <WishlistDrawer />
        <ProductDetailModal />
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
