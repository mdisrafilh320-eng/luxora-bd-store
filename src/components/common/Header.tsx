import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Heart,
  User as UserIcon,
  Layers,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Package,
  Headphones,
  Sliders,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    t,
    cartCount,
    setIsCartOpen,
    wishlist,
    setIsWishlistOpen,
    user,
    setIsAuthModalOpen,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activeView,
    setActiveView,
    isAdmin,
    toggleAdminRole,
    logout,
    categories: dynamicCategories,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  const categories = [
    { id: 'all', nameEn: 'All Collection', nameBn: 'সব পণ্য' },
    ...(dynamicCategories || [])
      .filter((c) => c.isActive !== false && c.slug !== 'all')
      .map((c) => ({
        id: c.slug,
        nameEn: c.nameEn,
        nameBn: c.nameBn,
      })),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0A0C]/92 backdrop-blur-xl border-b border-[#1E1E28]">
      {/* Slim Top Announcement Bar */}
      <div className="bg-[#111116] border-b border-[#1E1E26] text-[11px] sm:text-xs text-[#A8A8B4] py-1 sm:py-1.5 px-3 sm:px-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{t('announcement')}</span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-[#8E8E98]">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              {language === 'bn' ? 'অফিসিয়াল ডিস্ট্রিবিউটর' : 'Official Distributor'}
            </span>
            <span className="h-3 w-[1px] bg-white/10" aria-hidden="true" />
            <span className="text-[#C0C0C8] whitespace-nowrap">Dhaka • Chittagong • Nationwide</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-[72px] lg:h-20 gap-2 sm:gap-4">
          {/* Left: Brand + Responsive Nav */}
          <div className="flex items-center gap-4 lg:gap-8 xl:gap-10 min-w-0">
            <button
              onClick={() => {
                setActiveView('store');
                setSelectedCategory('all');
                setSearchQuery('');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-md py-1 whitespace-nowrap shrink-0"
              aria-label="Luxora BD Home"
            >
              <span className="text-base min-[380px]:text-lg sm:text-xl lg:text-2xl font-bold tracking-[0.22em] sm:tracking-[0.35em] gold-text font-luxury select-none">
                LUXORA BD
              </span>
            </button>

            {/* Tablet Navigation (md -> lg: 768px - 1023px) */}
            <nav
              aria-label="Tablet navigation"
              className="hidden md:flex lg:hidden items-center gap-4 text-[11px] uppercase tracking-[0.14em] font-semibold"
            >
              <button
                onClick={() => {
                  setActiveView('store');
                  setSelectedCategory('all');
                }}
                className={`whitespace-nowrap shrink-0 py-2 transition-colors cursor-pointer ${
                  activeView === 'store'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                {language === 'bn' ? 'স্টোর' : 'Store'}
              </button>

              <button
                onClick={() => setActiveView('track')}
                className={`whitespace-nowrap shrink-0 py-2 transition-colors cursor-pointer ${
                  activeView === 'track'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                {language === 'bn' ? 'ট্র্যাকিং' : 'Track'}
              </button>

              <button
                onClick={() => setActiveView('support')}
                className={`whitespace-nowrap shrink-0 py-2 transition-colors cursor-pointer ${
                  activeView === 'support'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                {language === 'bn' ? 'সহায়তা' : 'Support'}
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg border text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                    activeView === 'admin'
                      ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                      : 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-semibold'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ERP</span>
                </button>
              )}
            </nav>

            {/* Desktop Navigation (>= 1024px) */}
            <nav
              aria-label="Desktop navigation"
              className="hidden lg:flex items-center gap-5 xl:gap-6 text-[10px] xl:text-[11px] uppercase tracking-[0.18em] font-semibold"
            >
              <button
                onClick={() => {
                  setActiveView('store');
                  setSelectedCategory('all');
                }}
                className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1.5 ${
                  activeView === 'store' && selectedCategory === 'all'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                {language === 'bn' ? 'হোম' : 'Home'}
              </button>

              {/* Quick Categories Dropdown */}
              <div className="relative group">
                <button
                  onClick={() => setActiveView('store')}
                  className={`whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors cursor-pointer py-1.5 ${
                    activeView === 'store' && selectedCategory !== 'all'
                      ? 'gold-text border-b gold-border font-bold'
                      : 'text-gray-400 hover:text-white border-b border-transparent'
                  }`}
                >
                  <span>{language === 'bn' ? 'সংগ্রহ' : 'Collection'}</span>
                  <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform duration-200" />
                </button>

                <div className="absolute top-full left-0 mt-2 w-56 card-bg border border-[#1E1E24] rounded-xl p-2 shadow-2xl shadow-black/90 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveView('store');
                        setSelectedCategory(cat.id);
                      }}
                      className={`w-full text-left px-3 py-2 text-[11px] tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? 'bg-[#1E1E24] gold-text font-bold'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{language === 'bn' ? cat.nameBn : cat.nameEn}</span>
                      {selectedCategory === cat.id && <span className="w-1.5 h-1.5 rounded-full gold-bg shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveView('track')}
                className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 ${
                  activeView === 'track'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{language === 'bn' ? 'ট্র্যাক অর্ডার' : 'Track Order'}</span>
              </button>

              <button
                onClick={() => setActiveView('support')}
                className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 ${
                  activeView === 'support'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-400 hover:text-white border-b border-transparent'
                }`}
              >
                <span>{language === 'bn' ? 'সহায়তা' : 'Support'}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    activeView === 'admin'
                      ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                      : 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-semibold'
                  }`}
                  title="Enterprise Admin ERP Control Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin ERP'}</span>
                </button>
              )}

              <button
                onClick={() => setActiveView('design-system')}
                className={`whitespace-nowrap shrink-0 hidden xl:flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 ${
                  activeView === 'design-system'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-500 hover:text-white border-b border-transparent'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{language === 'bn' ? 'টোকেন' : 'Tokens'}</span>
              </button>
            </nav>
          </div>

          {/* Right Action Icons & Bilingual Switcher */}
          <div className="flex items-center gap-1 sm:gap-2.5 lg:gap-4 shrink-0">
            {/* Bilingual Switcher */}
            <div className="flex items-center border border-[#1E1E26] rounded-full p-0.5 bg-black shrink-0">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 sm:px-2.5 py-1 min-h-[32px] rounded-full text-[10px] uppercase transition-all cursor-pointer whitespace-nowrap ${
                  language === 'en'
                    ? 'slate-bg gold-text font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white font-medium'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={`px-2 sm:px-2.5 py-1 min-h-[32px] rounded-full text-[10px] transition-all cursor-pointer font-bangla whitespace-nowrap ${
                  language === 'bn'
                    ? 'slate-bg gold-text font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white font-medium'
                }`}
              >
                বাং
              </button>
            </div>

            {/* Wishlist Button (Desktop/Tablet - on small mobile BottomNav also shows it, keep accessible on >=380px or everywhere cleanly) */}
            <button
              id="wishlist-drawer-trigger"
              onClick={() => setIsWishlistOpen(true)}
              className="hidden min-[400px]:flex relative min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 gold-bg text-[#0A0A0C] text-[9px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Trigger */}
            <button
              id="cart-drawer-trigger"
              onClick={() => setIsCartOpen(true)}
              className="relative cursor-pointer min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 gold-bg text-[#0A0A0C] text-[9px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full tabular-nums">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / VIP Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="auth-modal-trigger"
                onClick={() => {
                  if (user) {
                    setIsUserMenuOpen(!isUserMenuOpen);
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }}
                className="min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-full flex items-center justify-center transition-all cursor-pointer group hover:bg-white/5"
                aria-label="User Account"
                title={user ? `${user.name} (${isAdmin ? 'Admin' : user.membershipTier})` : t('signIn')}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center text-[11px] font-bold ${
                    user
                      ? isAdmin
                        ? 'border-[#D4AF37] bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-black font-black shadow-[0_0_10px_rgba(212,175,55,0.35)]'
                        : 'border-[#D4AF37]/60 gold-bg text-[#0A0A0C]'
                      : 'border-white/15 slate-bg text-gray-300 group-hover:border-[#D4AF37]/60 group-hover:text-white'
                  }`}
                >
                  {user ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
              </button>

              {user && isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 card-bg border border-[#262630] rounded-2xl p-2.5 shadow-2xl z-50 text-[#F3F4F6]">
                  <div className="p-2.5 border-b border-white/5 pb-3 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full gold-bg text-black font-bold flex items-center justify-center text-sm shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {user.email || user.phoneNumber || 'Valued Member'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      {isAdmin ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] text-black flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          ADMIN ACCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider slate-bg border border-white/10 text-gray-300">
                          {user.membershipTier} Member
                        </span>
                      )}
                      <span className="text-[10px] text-[#D4AF37] font-mono font-bold tabular-nums">
                        {user.points || 100} PTS
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 min-h-[42px] rounded-xl text-xs font-semibold bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 transition-all flex items-center justify-between mb-1.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Control Center</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-black text-[#D4AF37] px-1.5 py-0.5 rounded">
                        ERP
                      </span>
                    </button>
                  )}

                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveView('account');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 min-h-[40px] rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span>{language === 'bn' ? 'আমার অর্ডার ও প্রোফাইল' : 'My Orders & Account'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('track');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 min-h-[40px] rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Order'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('support');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 min-h-[40px] rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5 text-gray-400" />
                      <span>{language === 'bn' ? 'সহায়তা ও FAQ' : 'Help & FAQ'}</span>
                    </button>
                  </div>

                  <div className="border-t border-white/5 mt-1.5 pt-1.5">
                    <button
                      onClick={() => {
                        toggleAdminRole();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 min-h-[38px] rounded-xl text-[11px] text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sliders className="w-3 h-3" />
                        <span>Toggle Admin Access</span>
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          isAdmin
                            ? 'text-green-400 bg-green-950/40 border border-green-500/30'
                            : 'text-gray-500 bg-white/5'
                        }`}
                      >
                        {isAdmin ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full text-left px-3 min-h-[40px] rounded-xl text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors flex items-center gap-2 mt-0.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লগ আউট' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile & Tablet Menu Hamburger (< 1024px) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-[#D4AF37]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Slide-down Drawer Menu (< 1024px) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-[#1E1E26]"
            >
              <div className="py-4 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setActiveView('store');
                      setSelectedCategory('all');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      activeView === 'store' && selectedCategory === 'all'
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'bg-[#14141A] text-[#EDEDED] hover:bg-[#1C1D25]'
                    }`}
                  >
                    <span>{t('navHome')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('track');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      activeView === 'track'
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'bg-[#14141A] text-[#D4AF37] hover:bg-[#1C1D25]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'bn' ? 'ট্র্যাক অর্ডার' : 'Track Order'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('support');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      activeView === 'support'
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'bg-[#14141A] text-gray-200 hover:bg-[#1C1D25]'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'bn' ? 'সহায়তা ও FAQ' : 'Help & FAQ'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsWishlistOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="min-[400px]:hidden min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center justify-between gap-2 bg-[#14141A] text-gray-200 hover:bg-[#1C1D25] cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{language === 'bn' ? 'উইশলিস্ট' : 'Wishlist'}</span>
                    </span>
                    {wishlist.length > 0 && (
                      <span className="text-[10px] font-bold text-[#D4AF37] tabular-nums">{wishlist.length}</span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      activeView === 'admin'
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'bg-[#14141A] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#1C1D25]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'bn' ? 'ইআরপি অ্যাডমিন' : 'ERP Admin'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('design-system');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`min-h-[44px] px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      activeView === 'design-system'
                        ? 'bg-[#D4AF37] text-black font-bold'
                        : 'bg-[#14141A] text-gray-300 hover:bg-[#1C1D25]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
                    <span>{t('navDesignSystem')}</span>
                  </button>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-[#7E7E8A] uppercase tracking-wider block mb-2 font-semibold">
                    {t('navCategories')}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveView('store');
                          setSelectedCategory(cat.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`min-h-[42px] px-3 py-2 text-xs rounded-xl text-left truncate cursor-pointer transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-[#D4AF37]/15 text-[#D4AF37] font-semibold border border-[#D4AF37]/30'
                            : 'bg-[#121216] text-[#B0B0BC] hover:text-white border border-white/5'
                        }`}
                      >
                        {language === 'bn' ? cat.nameBn : cat.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
