import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  Search, 
  User as UserIcon, 
  Globe, 
  Sparkles, 
  Layers, 
  Menu, 
  X,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Package,
  Headphones,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';

export const Header: React.FC = () => {
  const { 
    language, 
    setLanguage,
    toggleLanguage, 
    t, 
    cartCount, 
    setIsCartOpen, 
    wishlist, 
    setIsWishlistOpen,
    user, 
    setIsAuthModalOpen,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activeView,
    setActiveView,
    isAdmin,
    toggleAdminRole,
    logout
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
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

  const categories: { id: ProductCategory; labelKey: 'catAll' | 'catAudio' | 'catWearables' | 'catDeskCharging' | 'catApple' | 'catPhotography' | 'catLifestyle' }[] = [
    { id: 'all', labelKey: 'catAll' },
    { id: 'audio', labelKey: 'catAudio' },
    { id: 'wearables', labelKey: 'catWearables' },
    { id: 'desk-charging', labelKey: 'catDeskCharging' },
    { id: 'apple-ecosystem', labelKey: 'catApple' },
    { id: 'photography', labelKey: 'catPhotography' },
    { id: 'lifestyle', labelKey: 'catLifestyle' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-[#1E1E28]">
      {/* Top Announcement Bar */}
      <div className="bg-[#111116] border-b border-[#1E1E26] text-[11px] sm:text-xs text-[#A8A8B4] py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="truncate">{t('announcement')}</span>
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0 text-[#8E8E98]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              {language === 'bn' ? 'অফিসিয়াল ডিস্ট্রিবিউটর' : 'Official Distributor'}
            </span>
            <span className="h-3 w-[1px] bg-white/10" />
            <span className="text-[#C0C0C8]">Dhaka • Chittagong • Nationwide</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-8 lg:gap-12">
            <button
              onClick={() => {
                setActiveView('store');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
              aria-label="Luxora BD Home"
            >
              <div className="text-xl sm:text-2xl font-bold tracking-[0.4em] gold-text font-luxury select-none">
                LUXORA BD
              </div>
            </button>

            {/* Desktop Category Navigation */}
            <nav className="hidden lg:flex items-center gap-6 text-[10px] uppercase tracking-[0.2em] font-semibold">
              <button
                onClick={() => {
                  setActiveView('store');
                  setSelectedCategory('all');
                }}
                className={`transition-colors cursor-pointer pb-1 ${
                  activeView === 'store' && selectedCategory === 'all'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-500 hover:text-white border-b border-transparent'
                }`}
              >
                {language === 'bn' ? 'হোম / Home' : 'Home / হোম'}
              </button>

              {/* Quick Categories Filter Dropdown */}
              <div className="relative group">
                <button 
                  onClick={() => setActiveView('store')}
                  className={`flex items-center gap-1 transition-colors cursor-pointer pb-1 ${
                    activeView === 'store' && selectedCategory !== 'all'
                      ? 'gold-text border-b gold-border font-bold'
                      : 'text-gray-500 hover:text-white border-b border-transparent'
                  }`}
                >
                  <span>{language === 'bn' ? 'সংগ্রহ / Collection' : 'Collection / সংগ্রহ'}</span>
                  <ChevronDown className="w-3 h-3 group-hover:rotate-180 transition-transform duration-200" />
                </button>

                {/* Dropdown Menu */}
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
                      <span>{t(cat.labelKey)}</span>
                      {selectedCategory === cat.id && <span className="w-1.5 h-1.5 rounded-full gold-bg" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Track Order Navigation */}
              <button
                onClick={() => setActiveView('track')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 ${
                  activeView === 'track'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-500 hover:text-white border-b border-transparent'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full gold-bg animate-pulse" />
                <span>{language === 'bn' ? 'ট্র্যাক অর্ডার' : 'Track Order'}</span>
              </button>

              {/* Support & FAQ Navigation */}
              <button
                onClick={() => setActiveView('support')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 ${
                  activeView === 'support'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-500 hover:text-white border-b border-transparent'
                }`}
              >
                <span>{language === 'bn' ? 'সহায়তা' : 'Support'}</span>
              </button>

              {/* Prominent Admin Panel Top Header Link */}
              {isAdmin && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
                    activeView === 'admin'
                      ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                      : 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-semibold'
                  }`}
                  title="Enterprise Admin ERP Control Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অ্যাডমিন প্যানেল' : 'Admin Panel'}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-black text-[#D4AF37] uppercase">ERP</span>
                </button>
              )}

              {/* Design System Tokens Tab */}
              <button
                onClick={() => setActiveView('design-system')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer pb-1 ${
                  activeView === 'design-system'
                    ? 'gold-text border-b gold-border font-bold'
                    : 'text-gray-500 hover:text-white border-b border-transparent'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>{language === 'bn' ? 'টোকেন / Design Tokens' : 'Tokens / টোকেন'}</span>
              </button>
            </nav>
          </div>

          {/* Right Action Icons & Bilingual Switcher */}
          <div className="flex items-center gap-3 sm:gap-5">
            
            {/* Search Box */}
            <div className="relative hidden md:block w-36 lg:w-52">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'store') setActiveView('store');
                }}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-[#121212] text-xs text-[#F3F4F6] placeholder-gray-600 border border-[#1E1E24] rounded-full pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Bilingual Switcher Pill (Matching Elegant Dark Design Theme) */}
            <div className="flex items-center border border-[#1E1E24] rounded-full px-1 py-1 bg-black">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-[10px] uppercase transition-all cursor-pointer ${
                  language === 'en'
                    ? 'slate-bg gold-text font-bold shadow-sm'
                    : 'text-gray-500 hover:text-white font-medium'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 rounded-full text-[10px] transition-all cursor-pointer font-bangla ${
                  language === 'bn'
                    ? 'slate-bg gold-text font-bold shadow-sm'
                    : 'text-gray-500 hover:text-white font-medium'
                }`}
              >
                বাং
              </button>
            </div>

            {/* Wishlist Button */}
            <button
              id="wishlist-drawer-trigger"
              onClick={() => setIsWishlistOpen(true)}
              className="relative p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 gold-bg text-[#0A0A0C] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Cart Drawer Trigger with Elegant Dark Gold Badge */}
            <button
              id="cart-drawer-trigger"
              onClick={() => setIsCartOpen(true)}
              className="relative cursor-pointer p-1.5 text-gray-400 hover:text-white transition-colors"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 text-gray-300 hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 gold-bg text-[#0A0A0C] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
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
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer group ${
                  user 
                    ? isAdmin 
                      ? 'border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                      : 'border-[#D4AF37]/50 hover:border-[#D4AF37]' 
                    : 'border-white/10 hover:border-[#D4AF37]/50'
                }`}
                aria-label="User Account"
                title={user ? `${user.name} (${isAdmin ? 'Admin' : user.membershipTier})` : t('signIn')}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  user 
                    ? isAdmin 
                      ? 'bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-black font-black' 
                      : 'gold-bg text-[#0A0A0C]' 
                    : 'slate-bg text-gray-400 group-hover:text-white'
                }`}>
                  {user ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
              </button>

              {/* Rich User Profile Dropdown Menu */}
              {user && isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 card-bg border border-[#262630] rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#F3F4F6]">
                  {/* Top Profile Card */}
                  <div className="p-2.5 border-b border-white/5 pb-3 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full gold-bg text-black font-bold flex items-center justify-center text-sm shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{user.email || user.phoneNumber || 'Valued Member'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2.5 flex items-center justify-between pt-1">
                      {isAdmin ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] text-black flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          ADMIN ACCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider slate-bg border border-white/10 text-gray-300">
                          {user.membershipTier} Member
                        </span>
                      )}
                      <span className="text-[10px] text-[#D4AF37] font-mono font-bold">
                        {user.points || 100} PTS
                      </span>
                    </div>
                  </div>

                  {/* Direct Admin Control Center Button */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#D4AF37]/15 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 transition-all flex items-center justify-between mb-1.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Admin Control Center</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase bg-black text-[#D4AF37] px-1.5 py-0.5 rounded">ERP</span>
                    </button>
                  )}

                  {/* Standard Navigation Links */}
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveView('account');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span>{language === 'bn' ? 'আমার অর্ডার ও প্রোফাইল' : 'My Orders & Account'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('track');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full gold-bg" />
                      <span>{language === 'bn' ? 'অর্ডার ট্র্যাক করুন' : 'Track Order'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('support');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5 text-gray-400" />
                      <span>{language === 'bn' ? 'সহায়তা ও FAQ' : 'Help & FAQ'}</span>
                    </button>
                  </div>

                  {/* Dev / Admin Mode Switcher for Quick Preview */}
                  <div className="border-t border-white/5 mt-1.5 pt-1.5">
                    <button
                      onClick={() => {
                        toggleAdminRole();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-[11px] text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sliders className="w-3 h-3" />
                        <span>Toggle Admin Access</span>
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isAdmin ? 'text-green-400 bg-green-950/40 border border-green-500/30' : 'text-gray-500 bg-white/5'}`}>
                        {isAdmin ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors flex items-center gap-2 mt-0.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'লগ আউট' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Expansion */}
        {isSearchExpanded && (
          <div className="sm:hidden pb-3 pt-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeView !== 'store') setActiveView('store');
                }}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-[#14141A] text-xs text-[#EDEDED] placeholder-[#70707C] border border-[#22222C] rounded-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#D4AF37]"
                autoFocus
              />
              <Search className="w-4 h-4 text-[#70707C] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#1E1E26] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveView('store');
                  setSelectedCategory('all');
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl text-left ${
                  activeView === 'store' && selectedCategory === 'all'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'bg-[#14141A] text-[#EDEDED]'
                }`}
              >
                {t('navHome')}
              </button>
              <button
                onClick={() => {
                  setActiveView('track');
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center gap-1.5 ${
                  activeView === 'track'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'bg-[#14141A] text-[#D4AF37]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full gold-bg animate-pulse" />
                <span>{language === 'bn' ? 'ট্র্যাক অর্ডার' : 'Track Order'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('support');
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center gap-1.5 ${
                  activeView === 'support'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'bg-[#14141A] text-gray-300'
                }`}
              >
                <span>{language === 'bn' ? 'সহায়তা ও FAQ' : 'Help & FAQ'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-[#D4AF37] text-black font-bold'
                    : 'bg-[#14141A] text-[#D4AF37] border border-[#D4AF37]/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ইআরপি অ্যাডমিন' : 'ERP Admin'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('design-system');
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center gap-1.5 ${
                  activeView === 'design-system'
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#14141A] text-[#D4AF37]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('navDesignSystem')}</span>
              </button>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-[#7E7E8A] uppercase tracking-wider block mb-2 font-semibold">
                {t('navCategories')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveView('store');
                      setSelectedCategory(cat.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 text-xs rounded-sm text-left truncate ${
                      selectedCategory === cat.id
                        ? 'bg-[#D4AF37]/15 text-[#D4AF37] font-semibold border border-[#D4AF37]/30'
                        : 'bg-[#121216] text-[#B0B0BC] hover:text-white'
                    }`}
                  >
                    {t(cat.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
