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
    isAdmin
  } = useApp();

  const handleHomeClick = () => {
    setActiveView('store');
    setSelectedCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCatalogClick = () => {
    setActiveView('store');
    const catalogElem = document.getElementById('catalog-section');
    if (catalogElem) {
      catalogElem.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-2xl border-t border-[#1E1E26] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.8)]"
    >
      {/* 1. Home */}
      <button
        onClick={handleHomeClick}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-all ${
          activeView === 'store' ? 'text-[#D4AF37] font-bold' : 'text-gray-400 hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] tracking-tight font-sans">
          {language === 'bn' ? 'হোম' : 'Home'}
        </span>
      </button>

      {/* 2. Catalog */}
      <button
        onClick={handleCatalogClick}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-all"
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] tracking-tight font-sans">
          {language === 'bn' ? 'ক্যাটালগ' : 'Catalog'}
        </span>
      </button>

      {/* 3. Wishlist */}
      <button
        onClick={() => setIsWishlistOpen(true)}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-all relative"
        aria-label={`Wishlist with ${wishlist.length} items`}
      >
        <div className="relative flex items-center justify-center">
          <Heart className="w-5 h-5" />
          {wishlist.length > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-black flex items-center justify-center leading-none">
              {wishlist.length}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight font-sans">
          {language === 'bn' ? 'উইশলিস্ট' : 'Wishlist'}
        </span>
      </button>

      {/* 4. Bag / Cart */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white cursor-pointer transition-all relative"
        aria-label={`Cart with ${cartCount} items`}
      >
        <div className="relative flex items-center justify-center">
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D4AF37] text-black text-[9px] font-black flex items-center justify-center leading-none">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight font-sans">
          {language === 'bn' ? 'ব্যাগ' : 'Bag'}
        </span>
      </button>

      {/* 5. Account or Admin */}
      {isAdmin ? (
        <button
          onClick={() => setActiveView('admin')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-all ${
            activeView === 'admin' ? 'text-[#D4AF37] font-bold' : 'text-[#D4AF37]/70 hover:text-[#D4AF37]'
          }`}
          title="Admin ERP"
        >
          <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
          <span className="text-[10px] font-bold text-[#D4AF37] tracking-tight font-sans">
            {language === 'bn' ? 'ইআরপি' : 'Admin'}
          </span>
        </button>
      ) : (
        <button
          onClick={handleAccountClick}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-1 py-1 cursor-pointer transition-all ${
            activeView === 'account' ? 'text-[#D4AF37] font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-tight font-sans">
            {user ? (language === 'bn' ? 'প্রোফাইল' : 'VIP') : (language === 'bn' ? 'লগইন' : 'Account')}
          </span>
        </button>
      )}
    </nav>
  );
};
