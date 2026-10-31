import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Language, 
  ProductCategory, 
  Product, 
  CartItem, 
  UserProfile, 
  ToastMessage,
  Order,
  PaymentSettings,
  AdminRole 
} from '../types';
import { adminRbacService, isSuperAdminEmail, PRIMARY_SUPER_ADMIN_EMAIL } from '../services/adminRbacService';
import { translations } from '../translations';
import { mockProducts } from '../data/mockProducts';
import { validateFirestoreConnection } from '../lib/firebase';
import { 
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  signInWithGoogle as fbSignInWithGoogle,
  sendPhoneOtp as fbSendPhoneOtp,
  verifyPhoneOtp as fbVerifyPhoneOtp,
  signInAsGuest as fbSignInAsGuest,
  logoutUser as fbLogoutUser,
  sendPasswordReset as fbSendPasswordReset,
  subscribeToAuthState,
  getUserProfile,
  syncUserProfile,
  initRecaptcha,
  checkRedirectResult
} from '../services/authService';
import { getProducts } from '../services/productService';
import { paymentService, DEFAULT_PAYMENT_SETTINGS } from '../services/paymentService';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

interface AppContextType {
  // Language & Localization
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations.en, variables?: Record<string, string | number>) => string;

  // Products Data
  products: Product[];
  isLoadingProducts: boolean;
  refreshProducts: () => Promise<void>;

  // Cart State
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedColor?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartCount: number;
  cartSubtotal: number;
  freeDeliveryThreshold: number;
  isFreeDeliveryUnlocked: boolean;
  freeDeliveryDifference: number;

  // Wishlist State
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;

  // Firebase Authentication State & Handlers
  user: UserProfile | null;
  currentUser: UserProfile | null;
  userProfile: UserProfile | null;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, phone?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  sendPhoneOtp: (phoneNumber: string, verifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmation: ConfirmationResult, otpCode: string, name?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;

  // Filter & Search & Quick View
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: ProductCategory;
  setSelectedCategory: (cat: ProductCategory) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;

  // Toast System
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Active View Switcher (Store vs. Checkout vs. Track vs. Support vs. Design System Explorer vs. Account vs. Admin ERP)
  activeView: 'store' | 'checkout' | 'track' | 'support' | 'design-system' | 'account' | 'admin';
  setActiveView: (view: 'store' | 'checkout' | 'track' | 'support' | 'design-system' | 'account' | 'admin') => void;
  cartItemsCount: number;

  // Enterprise Admin RBAC
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminRole: AdminRole | null;
  isCheckingAdminStatus: boolean;
  refreshAdminStatus: () => Promise<void>;
  setIsAdmin: (isAdmin: boolean) => void;
  toggleAdminRole: () => void;

  // Dynamic MFS & Payment Gateway Settings
  paymentSettings: PaymentSettings;
  isLoadingPaymentSettings: boolean;
  updatePaymentSettings: (newSettings: PaymentSettings) => Promise<void>;
  refreshPaymentSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const FREE_DELIVERY_THRESHOLD = 5000; // 5,000 BDT

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language state (persisted)
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('luxora_lang');
      return (saved === 'bn' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('luxora_lang', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  // Translation helper
  const t = useCallback((key: keyof typeof translations.en, variables?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let str = dict[key] || translations.en[key] || (key as string);
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  }, [language]);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toastData: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const newToast: ToastMessage = { ...toastData, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Products state (loaded from Firestore with local fallback)
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const refreshProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (err) {
      console.warn('Failed to load products from Firestore:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    validateFirestoreConnection();
    refreshProducts();
  }, [refreshProducts]);

  // Cart state (persisted, zero-state clean)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('luxora_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && item.product && item.product.id && typeof item.product.price === 'number');
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('luxora_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Wishlist state (persisted, zero-state clean)
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('luxora_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => p && p.id && p.nameEn);
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('luxora_wishlist', JSON.stringify(wishlist));
    } catch {
      // ignore
    }
  }, [wishlist]);

  // Firebase User Auth State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('luxora_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return null;
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check redirect result and subscribe to Firebase Auth changes
  useEffect(() => {
    // Check for incoming redirect sign-in result (e.g. from mobile / popup-blocked redirects)
    checkRedirectResult()
      .then((profile) => {
        if (profile) {
          setUser(profile);
          try {
            localStorage.setItem('luxora_user', JSON.stringify(profile));
          } catch {}
        }
      })
      .catch((err) => console.warn('Redirect check on mount:', err));

    const unsubscribe = subscribeToAuthState(async (fbUser) => {
      setIsAuthLoading(true);
      if (fbUser) {
        try {
          let profile = await getUserProfile(fbUser.uid);
          if (!profile) {
            profile = await syncUserProfile(fbUser, { language });
          }
          setUser(profile);
          try {
            localStorage.setItem('luxora_user', JSON.stringify(profile));
          } catch {}
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        // Check if there is a local guest session
        try {
          const isGuestSession = localStorage.getItem('luxora_guest_session') === 'true';
          const savedUser = localStorage.getItem('luxora_user');
          if (isGuestSession && savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            setUser(null);
            localStorage.removeItem('luxora_user');
          }
        } catch {
          setUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [language]);

  // Auth Handlers
  const handleLoginWithEmail = async (email: string, pass: string) => {
    const profile = await fbLoginWithEmail(email, pass);
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'success',
      titleEn: 'Authentication Successful',
      titleBn: 'লগইন সফল হয়েছে',
      descriptionEn: `Welcome back, ${profile.name}.`,
      descriptionBn: `স্বাগতম, ${profile.name}।`,
    });
  };

  const handleRegisterWithEmail = async (
    name: string, 
    email: string, 
    pass: string, 
    phone: string = ''
  ) => {
    const profile = await fbRegisterWithEmail(name, email, pass, phone, language);
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'success',
      titleEn: 'Luxora Account Created',
      titleBn: 'অ্যাকাউন্ট তৈরি সম্পন্ন',
      descriptionEn: `Welcome to Luxora Privilege Club, ${profile.name}.`,
      descriptionBn: `লাক্সোরাতে আপনাকে স্বাগতম, ${profile.name}।`,
    });
  };

  const handleSendPasswordReset = async (email: string) => {
    await fbSendPasswordReset(email);
    addToast({
      type: 'info',
      titleEn: 'Password Reset Link Sent',
      titleBn: 'পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে',
      descriptionEn: `A recovery link has been sent to ${email}.`,
      descriptionBn: `${email} ঠিকানায় রিকভারি লিংক পাঠানো হয়েছে।`,
    });
  };

  const handleSignInWithGoogle = async () => {
    const profile = await fbSignInWithGoogle();
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'success',
      titleEn: 'Google Sign-In Verified',
      titleBn: 'গুগল সাইন-ইন সফল',
      descriptionEn: `Signed in as ${profile.name}.`,
      descriptionBn: `${profile.name} হিসেবে সাইন ইন সম্পন্ন।`,
    });
  };

  const handleSetupRecaptcha = (containerId: string) => {
    return initRecaptcha(containerId);
  };

  const handleSendPhoneOtp = async (phoneNumber: string, verifier: RecaptchaVerifier) => {
    return await fbSendPhoneOtp(phoneNumber, verifier);
  };

  const handleVerifyPhoneOtp = async (
    confirmation: ConfirmationResult, 
    otpCode: string, 
    name?: string
  ) => {
    const profile = await fbVerifyPhoneOtp(confirmation, otpCode, name);
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'success',
      titleEn: 'Phone Verified Successfully',
      titleBn: 'ফোন নম্বর ভেরিফিকেশন সফল',
      descriptionEn: `Welcome, ${profile.name}.`,
      descriptionBn: `স্বাগতম, ${profile.name}।`,
    });
  };

  const handleSignInAsGuest = async () => {
    const profile = await fbSignInAsGuest();
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'info',
      titleEn: 'Guest Mode Activated',
      titleBn: 'গেস্ট সেশন সক্রিয়',
      descriptionEn: 'You can now browse items and checkout as a guest.',
      descriptionBn: 'আপনি পণ্য ব্রাউজ ও অর্ডার করতে পারবেন।',
    });
  };

  const handleLogout = async () => {
    await fbLogoutUser();
    setUser(null);
    addToast({
      type: 'info',
      titleEn: 'Signed Out',
      titleBn: 'লগআউট সম্পন্ন',
      descriptionEn: 'You have been safely signed out from Luxora BD.',
      descriptionBn: 'আপনি সফলভাবে লগআউট হয়েছেন।',
    });
  };

  // Cart actions
  const addToCart = (product: Product, quantity = 1, selectedColor?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedColor === selectedColor
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        return [...prev, { product, quantity, selectedColor: selectedColor || product.colors?.[0]?.name }];
      }
    });

    addToast({
      type: 'success',
      titleEn: 'Added to Bag',
      titleBn: 'শপিং ব্যাগে যুক্ত হয়েছে',
      descriptionEn: `${product.nameEn} (x${quantity})`,
      descriptionBn: `${product.nameBn} (x${quantity})`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Wishlist actions
  const toggleWishlist = (product: Product) => {
    const exists = wishlist.some((p) => p.id === product.id);
    if (exists) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
      addToast({
        type: 'info',
        titleEn: 'Removed from Wishlist',
        titleBn: 'উইশলিস্ট থেকে সরানো হয়েছে',
        descriptionEn: product.nameEn,
        descriptionBn: product.nameBn,
      });
    } else {
      setWishlist((prev) => [...prev, product]);
      addToast({
        type: 'success',
        titleEn: 'Saved to Wishlist',
        titleBn: 'উইশলিস্টে সংরক্ষিত হয়েছে',
        descriptionEn: product.nameEn,
        descriptionBn: product.nameBn,
      });
    }
  };

  const isInWishlist = (productId: string) => wishlist.some((p) => p.id === productId);

  // Cart calculations
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isFreeDeliveryUnlocked = cartSubtotal >= FREE_DELIVERY_THRESHOLD;
  const freeDeliveryDifference = Math.max(0, FREE_DELIVERY_THRESHOLD - cartSubtotal);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // View state
  const [activeView, setActiveView] = useState<'store' | 'checkout' | 'track' | 'support' | 'design-system' | 'account' | 'admin'>('store');

  // Enterprise Admin RBAC State
  const [adminRole, setAdminRole] = useState<AdminRole | null>(() => {
    if (user?.email && isSuperAdminEmail(user.email)) return 'super_admin';
    return null;
  });
  const [isAdmin, setIsAdminState] = useState<boolean>(() => {
    return Boolean(user?.email && isSuperAdminEmail(user.email));
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    return Boolean(user?.email && isSuperAdminEmail(user.email));
  });
  const [isCheckingAdminStatus, setIsCheckingAdminStatus] = useState<boolean>(false);

  // Eliminate any legacy localStorage overrides
  useEffect(() => {
    try {
      localStorage.removeItem('luxora_admin_override');
    } catch {}
  }, []);

  const verifyUserAdminStatus = useCallback(async (targetUser: UserProfile | null) => {
    if (!targetUser || targetUser.isGuest) {
      setIsAdminState(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setIsCheckingAdminStatus(false);
      return;
    }

    if (isSuperAdminEmail(targetUser.email)) {
      setIsAdminState(true);
      setIsSuperAdmin(true);
      setAdminRole('super_admin');
      setIsCheckingAdminStatus(false);
      return;
    }

    setIsCheckingAdminStatus(true);
    try {
      const res = await adminRbacService.verifyAdminAccess(targetUser.email, targetUser.id);
      setIsAdminState(res.isAuthorized);
      setIsSuperAdmin(res.isSuperAdmin);
      setAdminRole(res.isAuthorized ? (res.role as AdminRole) : null);
    } catch (err) {
      console.warn('Error verifying admin authorization:', err);
      setIsAdminState(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
    } finally {
      setIsCheckingAdminStatus(false);
    }
  }, []);

  useEffect(() => {
    verifyUserAdminStatus(user);
  }, [user, verifyUserAdminStatus]);

  const refreshAdminStatus = async () => {
    await verifyUserAdminStatus(user);
  };

  const setIsAdmin = (value: boolean) => {
    if (!isSuperAdmin && !isAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Admin Access Restricted',
        titleBn: 'অ্যাডমিন এক্সেস সংরক্ষিত',
        descriptionEn: 'You do not have permission to manually enable admin mode.',
        descriptionBn: 'আপনার অ্যাকাউন্টে অ্যাডমিন মোড চালুর অনুমতি নেই।',
      });
      return;
    }
    setIsAdminState(value);
  };

  const toggleAdminRole = () => {
    if (!isAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Authentication Required',
        titleBn: 'লগইন আবশ্যক',
        descriptionEn: 'Please sign in with an authorized admin account to access ERP.',
        descriptionBn: 'ইআরপি ব্যবহারে অনুমোদিত অ্যাডমিন অ্যাকাউন্ট দিয়ে সাইন ইন করুন।',
      });
      setActiveView('admin');
      return;
    }
    if (activeView === 'admin') {
      setActiveView('store');
    } else {
      setActiveView('admin');
    }
  };

  // Payment Gateway Settings (Dynamic MFS)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState<boolean>(true);

  // Subscribe to real-time Payment Gateway settings from Firestore
  useEffect(() => {
    const unsubscribe = paymentService.subscribeToPaymentSettings((settings) => {
      setPaymentSettings(settings);
      setIsLoadingPaymentSettings(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const refreshPaymentSettings = async () => {
    setIsLoadingPaymentSettings(true);
    try {
      const settings = await paymentService.getPaymentSettings();
      setPaymentSettings(settings);
    } catch (err) {
      console.warn('Manual payment settings refresh error:', err);
    } finally {
      setIsLoadingPaymentSettings(false);
    }
  };

  const updatePaymentSettings = async (newSettings: PaymentSettings) => {
    setIsLoadingPaymentSettings(true);
    try {
      const saved = await paymentService.savePaymentSettings(newSettings, user?.email || 'Admin');
      setPaymentSettings(saved);
      addToast({
        type: 'success',
        titleEn: 'Payment Gateway Settings Saved',
        titleBn: 'পেমেন্ট গেটওয়ে সেটিংস সংরক্ষিত হয়েছে',
        descriptionEn: 'MFS numbers & status synced to customer checkout in real-time.',
        descriptionBn: 'বিকাশ, নগদ ও রকেট সেটিংস চেকআউট পেজে আপডেট হয়েছে।',
      });
    } catch (err: any) {
      console.error('Failed to save payment settings:', err);
      addToast({
        type: 'error',
        titleEn: 'Failed to Save Settings',
        titleBn: 'সেটিংস সংরক্ষণে ব্যর্থ',
        descriptionEn: err?.message || 'Check Firestore database connectivity and permissions.',
      });
      throw err;
    } finally {
      setIsLoadingPaymentSettings(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        products,
        isLoadingProducts,
        refreshProducts,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartCount,
        cartItemsCount: cartCount,
        cartSubtotal,
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        isFreeDeliveryUnlocked,
        freeDeliveryDifference,
        wishlist,
        toggleWishlist,
        isInWishlist,
        isWishlistOpen,
        setIsWishlistOpen,
        user,
        currentUser: user,
        userProfile: user,
        isLoggedIn: !!user,
        isAuthLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginWithEmail: handleLoginWithEmail,
        registerWithEmail: handleRegisterWithEmail,
        sendPasswordReset: handleSendPasswordReset,
        signInWithGoogle: handleSignInWithGoogle,
        setupRecaptcha: handleSetupRecaptcha,
        sendPhoneOtp: handleSendPhoneOtp,
        verifyPhoneOtp: handleVerifyPhoneOtp,
        signInAsGuest: handleSignInAsGuest,
        logout: handleLogout,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        quickViewProduct,
        setQuickViewProduct,
        toasts,
        addToast,
        removeToast,
        activeView,
        setActiveView,
        isAdmin,
        isSuperAdmin,
        adminRole,
        isCheckingAdminStatus,
        refreshAdminStatus,
        setIsAdmin,
        toggleAdminRole,
        paymentSettings,
        isLoadingPaymentSettings,
        updatePaymentSettings,
        refreshPaymentSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
