import React from 'react';
import { Home, Compass, Heart, ShoppingBag, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setSelectedCategory,
    wishlist,
    cartCount,
    setIsWishlistOpen,
    setIsCartOpen,
    user,
    setIsAuthModalOpen,
    language,
    isAdmin,
  } = useApp();

  const handleHomeClick = () => {
    setActiveView('store');
    setSelectedCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCatalogClick = () => {
    setActiveView('store');
    setTimeout(() => {
      const catalogElem = document.getElementById('catalog-section');
      if (catalogElem) {
        catalogElem.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 320, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleAccountClick = () => {
    if (user) {
      setActiveView('account');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-2xl border-t border-[#1E1E26] px-1.5 pt-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-center shadow-[0_-10px_25px_rgba(0,0,0,0.85)]"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={handleHomeClick}
        className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors active:scale-95 ${
          activeView === 'store' ? 'text-[#D4AF37] font-semibold' : 'text-gray-400 hover:text-white'
        }`}
      >
        {activeView === 'store' && (
          <span className="absolute top-0 w-6 h-0.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
        )}
        <Home className="w-5 h-5" />
        <span className="text-[10px] tracking-tight font-sans truncate max-w-full px-1">
          {language === 'bn' ? 'হোম' : 'Home'}
        </span>
      </button>

      {/* 2. Catalog */}
      <button
        type="button"
        onClick={handleCatalogClick}
        className="relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-colors active:scale-95"
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] tracking-tight font-sans truncate max-w-full px-1">
          {language === 'bn' ? 'ক্যাটালগ' : 'Catalog'}
        </span>
      </button>

      {/* 3. Wishlist */}
      <button
        type="button"
        onClick={() => setIsWishlistOpen(true)}
        className="relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-colors active:scale-95"
        aria-label={`Wishlist with ${wishlist.length} items`}
      >
        <div className="relative flex items-center justify-center">
          <Heart className="w-5 h-5" />
          {wishlist.length > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-black flex items-center justify-center leading-none tabular-nums">
              {wishlist.length}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight font-sans truncate max-w-full px-1">
          {language === 'bn' ? 'উইশলিস্ট' : 'Wishlist'}
        </span>
      </button>

      {/* 4. Bag / Cart */}
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-colors active:scale-95"
        aria-label={`Cart with ${cartCount} items`}
      >
        <div className="relative flex items-center justify-center">
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-black flex items-center justify-center leading-none tabular-nums">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight font-sans truncate max-w-full px-1">
          {language === 'bn' ? 'ব্যাগ' : 'Bag'}
        </span>
      </button>

      {/* 5. Account or Admin */}
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setActiveView('admin')}
          className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors active:scale-95 ${
            activeView === 'admin' ? 'text-[#D4AF37] font-bold' : 'text-[#D4AF37]/80 hover:text-[#D4AF37]'
          }`}
          title="Admin ERP"
        >
          {activeView === 'admin' && (
            <span className="absolute top-0 w-6 h-0.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
          )}
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-tight font-sans truncate max-w-full px-1">
            {language === 'bn' ? 'ইআরপি' : 'Admin'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAccountClick}
          className={`relative min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-colors active:scale-95 ${
            activeView === 'account' ? 'text-[#D4AF37] font-semibold' : 'text-gray-400 hover:text-white'
          }`}
        >
          {activeView === 'account' && (
            <span className="absolute top-0 w-6 h-0.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
          )}
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-sans truncate max-w-full px-1">
            {user ? (language === 'bn' ? 'প্রোফাইল' : 'Account') : (language === 'bn' ? 'লগইন' : 'Sign In')}
          </span>
        </button>
      )}
    </nav>
  );
};
