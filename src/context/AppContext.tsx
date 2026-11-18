import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Language,
  ProductCategory,
  Product,
  CartItem,
  UserProfile,
  SavedDeliveryInfo,
  ToastMessage,
  Order,
  PaymentSettings,
  AdminRole,
  HeroBannerItem,
  CategoryItem,
  ReturnPolicyConfig
} from '../types';
import {
  adminRbacService,
  isSuperAdminEmail,
} from '../services/adminRbacService';
import { translations } from '../translations';
import { mockProducts } from '../data/mockProducts';
import { auth, validateFirestoreConnection } from '../lib/firebase';
import {
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  signInWithGoogle as fbSignInWithGoogle,
  saveUserCheckoutProfile as fbSaveUserCheckoutProfile,
  logoutUser as fbLogoutUser,
  sendPasswordReset as fbSendPasswordReset,
  subscribeToAuthState,
  getUserProfile,
  syncUserProfile,
  checkRedirectResult,
  getPendingRegistrationSync
} from '../services/authService';
import {
  getProducts,
  subscribeToProducts,
  getLocalCachedProducts,
  sortProductsForCatalogDisplay,
  reshuffleVisitCatalogOrder,
} from '../services/productService';
import { paymentService, DEFAULT_PAYMENT_SETTINGS } from '../services/paymentService';
import {
  subscribeToBanners,
  subscribeToCategories,
  subscribeToReturnPolicy,
  saveReturnPolicy as fbSaveReturnPolicy,
  getCachedBanners,
  getCachedCategories,
  getCachedReturnPolicy,
  fetchBannersFromServer,
  fetchCategoriesFromServer,
  fetchReturnPolicyFromServer,
  resetStorefrontSeedFlags,
} from '../services/storefrontService';
import {
  initVersionedCache,
  safeGetItem,
  safeSetItem,
  safeGetJSON,
  safeSetJSON,
  safeRemoveItem,
  clearVolatileCaches,
  clearSessionCaches,
  STORAGE_KEYS,
} from '../utils/storage';

// Run versioned cache migration/cleanup once before initial React state hydration
initVersionedCache();

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
  reshuffleCatalog: () => void;
  addProductToState: (product: Product) => void;
  removeProductFromState: (productId: string) => void;

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
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  saveCheckoutProfile: (info: Omit<SavedDeliveryInfo, 'updatedAt'>) => Promise<UserProfile | null>;
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
  trackingOrderId: string;
  setTrackingOrderId: (orderId: string) => void;
  cartItemsCount: number;

  // Standard Admin RBAC (Super Admin, Store Admin / Supervisor, Fulfillment Staff)
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

  // Dynamic Storefront CMS (Hero Banners, Categories, Return Policy)
  banners: HeroBannerItem[];
  addBannerToState: (banner: HeroBannerItem) => void;
  removeBannerFromState: (bannerId: string) => void;
  updateBannerInState: (bannerId: string, patch: Partial<HeroBannerItem>) => void;
  categories: CategoryItem[];
  returnPolicy: ReturnPolicyConfig;
  updateReturnPolicy: (newPolicy: ReturnPolicyConfig) => Promise<void>;
  isReturnPolicyModalOpen: boolean;
  setIsReturnPolicyModalOpen: (open: boolean) => void;

  // Cross-Device Cache & Real-Time State Synchronization
  isSyncingState: boolean;
  forceSyncAllState: (options?: { silent?: boolean }) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const FREE_DELIVERY_THRESHOLD = 5000; // 5,000 BDT

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language state (persisted)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = safeGetItem(STORAGE_KEYS.LANG);
    return (saved === 'bn' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    safeSetItem(STORAGE_KEYS.LANG, lang);
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toastData: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const newToast: ToastMessage = { ...toastData, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  // Products state (initialized from cached catalog with per-visit fair shuffle & stock-out at bottom)
  const [products, setProducts] = useState<Product[]>(() =>
    sortProductsForCatalogDisplay(getLocalCachedProducts())
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Optimistic state updater to reflect newly created/edited items immediately
  const addProductToState = useCallback((newProduct: Product) => {
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== newProduct.id);
      return sortProductsForCatalogDisplay([newProduct, ...filtered]);
    });
  }, []);

  const removeProductFromState = useCallback((productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const reshuffleCatalog = useCallback(() => {
    setProducts((prev) => {
      reshuffleVisitCatalogOrder(prev.map((p) => p.id));
      return sortProductsForCatalogDisplay(prev);
    });
  }, []);

  const refreshProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await getProducts(true);
      if (Array.isArray(data)) {
        setProducts(sortProductsForCatalogDisplay(data));
      }
    } catch (err) {
      console.warn('Failed to load products from Firestore:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Incrementing nonce forces clean teardown and re-mount of Firestore snapshot subscriptions
  const [syncNonce, setSyncNonce] = useState<number>(0);
  const [isSyncingState, setIsSyncingState] = useState<boolean>(false);

  useEffect(() => {
    validateFirestoreConnection();
  }, [syncNonce]);

  // Cart state (persisted, quota-safe)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const parsed = safeGetJSON<CartItem[]>(STORAGE_KEYS.CART, []);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && item.product && item.product.id && typeof item.product.price === 'number');
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    safeSetJSON(STORAGE_KEYS.CART, cart);
  }, [cart]);

  // Wishlist state (persisted, quota-safe)
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const parsed = safeGetJSON<Product[]>(STORAGE_KEYS.WISHLIST, []);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p && p.id && p.nameEn);
    }
    return [];
  });

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  useEffect(() => {
    safeSetJSON(STORAGE_KEYS.WISHLIST, wishlist);
  }, [wishlist]);

  // Firebase User Auth State
  const [user, setUser] = useState<UserProfile | null>(() => {
    return safeGetJSON<UserProfile | null>(STORAGE_KEYS.USER, null);
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const languageRef = useRef(language);
  languageRef.current = language;
  const lastAuthUidRef = useRef<string | null>(null);

  // Check redirect result and subscribe to Firebase Auth changes (never re-subscribe on language toggle)
  useEffect(() => {
    // Check for incoming redirect sign-in result (e.g. from mobile / popup-blocked redirects)
    checkRedirectResult()
      .then((profile) => {
        if (profile) {
          setUser(profile);
          safeSetJSON(STORAGE_KEYS.USER, profile);
        }
      })
      .catch((err) => console.warn('Redirect check on mount:', err));

    const unsubscribe = subscribeToAuthState(async (fbUser) => {
      setIsAuthLoading(true);
      const nextUid = fbUser?.uid || null;
      const prevUid = lastAuthUidRef.current;

      // Clear per-session caches whenever account changes or signs out
      if (prevUid !== null && prevUid !== nextUid) {
        clearSessionCaches();
      }
      lastAuthUidRef.current = nextUid;

      if (fbUser) {
        try {
          const pendingSync = getPendingRegistrationSync(fbUser.uid);
          // Fetch fresh server profile when switching accounts or logging in
          let profile = pendingSync ? await pendingSync : await getUserProfile(fbUser.uid, true);
          if (!profile) {
            profile = await syncUserProfile(fbUser, { language: languageRef.current });
          }
          setUser(profile);
          safeSetJSON(STORAGE_KEYS.USER, profile);
        } catch (error) {
          console.warn('Firestore profile lookup fallback activated:', error);
          const cached = safeGetJSON<UserProfile | null>(STORAGE_KEYS.USER, null);
          let fallbackProfile: UserProfile | null =
            cached && cached.id === fbUser.uid ? cached : null;

          if (!fallbackProfile) {
            fallbackProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Luxora Member',
              email: fbUser.email || '',
              phoneNumber: fbUser.phoneNumber || '',
              photoURL: fbUser.photoURL || '',
              role: isSuperAdminEmail(fbUser.email) ? 'admin' : 'customer',
              membershipTier: 'Standard',
              language: languageRef.current,
              points: 100,
              savedAddresses: [],
              isGuest: false,
            };
          }
          setUser(fallbackProfile);
        }
      } else {
        setUser(null);
        clearSessionCaches();
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auth Handlers (Google & Email/Password only)
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
    pass: string
  ) => {
    const profile = await fbRegisterWithEmail(name, email, pass, language);
    setUser(profile);
    setIsAuthModalOpen(false);
    addToast({
      type: 'success',
      titleEn: 'Luxora Account Created',
      titleBn: 'অ্যাকাউন্ট তৈরি সম্পন্ন',
      descriptionEn: `Welcome to Luxora BD, ${profile.name}.`,
      descriptionBn: `লাক্সোরা বিডিতে আপনাকে স্বাগতম, ${profile.name}।`,
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

  const handleSaveCheckoutProfile = async (
    info: Omit<SavedDeliveryInfo, 'updatedAt'>
  ): Promise<UserProfile | null> => {
    if (!user || user.isGuest || !user.id) return null;
    const updatedProfile = await fbSaveUserCheckoutProfile(user.id, info);
    setUser(updatedProfile);
    return updatedProfile;
  };

  const handleLogout = async () => {
    await fbLogoutUser();
    setUser(null);
    setIsAdminState(false);
    setIsSuperAdmin(false);
    setAdminRole(null);
    clearSessionCaches();
    setSyncNonce((n) => n + 1);
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

  // View & Direct Order Tracking state
  const [activeView, setActiveView] = useState<'store' | 'checkout' | 'track' | 'support' | 'design-system' | 'account' | 'admin'>('store');
  const [trackingOrderId, setTrackingOrderId] = useState<string>('');

  // Standard Admin RBAC Verification (Super Admin, Store Admin / Supervisor, Fulfillment Staff)
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [isAdmin, setIsAdminState] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isCheckingAdminStatus, setIsCheckingAdminStatus] = useState<boolean>(true);

  // Eliminate any legacy localStorage overrides
  useEffect(() => {
    safeRemoveItem(STORAGE_KEYS.ADMIN_OVERRIDE);
  }, []);

  const verifyUserAdminStatus = useCallback(async (targetUser: UserProfile | null, authReady: boolean, forceServer = false) => {
    if (!authReady) {
      setIsCheckingAdminStatus(true);
      return;
    }

    const fbUser = auth.currentUser;
    if (!fbUser || !targetUser || targetUser.isGuest || fbUser.uid !== targetUser.id) {
      setIsAdminState(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setIsCheckingAdminStatus(false);
      return;
    }

    const verifiedEmail = fbUser.email || targetUser.email;
    if (isSuperAdminEmail(verifiedEmail)) {
      setIsAdminState(true);
      setIsSuperAdmin(true);
      setAdminRole('super_admin');
      setIsCheckingAdminStatus(false);
      return;
    }

    setIsCheckingAdminStatus(true);
    try {
      const res = await adminRbacService.verifyAdminAccess(verifiedEmail, fbUser.uid, { forceServer });
      setIsAdminState(res.isAdmin);
      setIsSuperAdmin(res.isSuperAdmin);
      setAdminRole(res.isAdmin && res.role !== 'none' ? res.role : null);
    } catch (err) {
      console.warn('Error verifying admin authorization:', err);
      setIsAdminState(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
    } finally {
      setIsCheckingAdminStatus(false);
    }
  }, []);

  // Real-time role subscription synced across devices/browsers
  useEffect(() => {
    if (isAuthLoading) {
      setIsCheckingAdminStatus(true);
      return;
    }

    const fbUser = auth.currentUser;
    if (!fbUser || !user || user.isGuest || fbUser.uid !== user.id) {
      setIsAdminState(false);
      setIsSuperAdmin(false);
      setAdminRole(null);
      setIsCheckingAdminStatus(false);
      return;
    }

    const verifiedEmail = fbUser.email || user.email;
    setIsCheckingAdminStatus(true);

    const unsubscribeRole = adminRbacService.subscribeToUserAdminAccess(
      verifiedEmail,
      fbUser.uid,
      (status) => {
        setIsAdminState(status.isAdmin);
        setIsSuperAdmin(status.isSuperAdmin);
        setAdminRole(status.isAdmin && status.role !== 'none' ? status.role : null);
        setIsCheckingAdminStatus(false);
      }
    );

    return () => {
      unsubscribeRole();
    };
  }, [user?.id, user?.email, user?.isGuest, isAuthLoading, syncNonce]);

  const refreshAdminStatus = useCallback(async () => {
    await verifyUserAdminStatus(user, !isAuthLoading, true);
  }, [user, isAuthLoading, verifyUserAdminStatus]);

  const setIsAdmin = (value: boolean) => {
    if (!isAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Access Denied',
        titleBn: 'অ্যাক্সেস ডিনাইড',
        descriptionEn: 'Admin privileges are required.',
        descriptionBn: 'অ্যাডমিন অনুমোদন প্রয়োজন।',
      });
      return;
    }
    setIsAdminState(value);
  };

  const toggleAdminRole = () => {
    if (!isAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Access Denied',
        titleBn: 'অ্যাক্সেস ডিনাইড',
        descriptionEn: 'You do not have permission to access the Admin Panel.',
        descriptionBn: 'আপনার অ্যাডমিন প্যানেলে প্রবেশের অনুমতি নেই।',
      });
      setActiveView('store');
      if (!user || user.isGuest) {
        setIsAuthModalOpen(true);
      }
      return;
    }
    if (activeView === 'admin') {
      setActiveView('store');
    } else {
      setActiveView('admin');
    }
  };

  // Payment Gateway Settings (Dynamic MFS)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() =>
    paymentService.getCachedPaymentSettings()
  );
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState<boolean>(true);

  const authSessionKey = user && !user.isGuest ? user.id : 'anon';

  const refreshPaymentSettings = useCallback(async () => {
    setIsLoadingPaymentSettings(true);
    try {
      const settings = await paymentService.getPaymentSettings(true);
      setPaymentSettings(settings);
    } catch (err) {
      console.warn('Manual payment settings refresh error:', err);
    } finally {
      setIsLoadingPaymentSettings(false);
    }
  }, []);

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

  // Storefront CMS State (Banners, Dynamic Categories, Editable Return Policy)
  const [banners, setBanners] = useState<HeroBannerItem[]>(() => getCachedBanners());
  const [categories, setCategories] = useState<CategoryItem[]>(() => getCachedCategories());
  const [returnPolicy, setReturnPolicy] = useState<ReturnPolicyConfig>(() => getCachedReturnPolicy());
  const [isReturnPolicyModalOpen, setIsReturnPolicyModalOpen] = useState<boolean>(false);

  const addBannerToState = useCallback((banner: HeroBannerItem) => {
    setBanners((prev) => {
      const filtered = prev.filter((b) => b.id !== banner.id);
      return [...filtered, banner].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    });
  }, []);

  const removeBannerFromState = useCallback((bannerId: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== bannerId));
  }, []);

  const updateBannerInState = useCallback((bannerId: string, patch: Partial<HeroBannerItem>) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === bannerId ? { ...b, ...patch } : b))
    );
  }, []);

  // Re-bind all real-time Firestore listeners cleanly on auth changes or manual/network resync
  useEffect(() => {
    const unsubProducts = subscribeToProducts((liveProducts) => {
      if (Array.isArray(liveProducts)) {
        setProducts(liveProducts);
      }
    });
    const unsubPayment = paymentService.subscribeToPaymentSettings((settings) => {
      setPaymentSettings(settings);
      setIsLoadingPaymentSettings(false);
    });
    const unsubBanners = subscribeToBanners((liveBanners) => {
      setBanners(liveBanners);
    });
    const unsubCategories = subscribeToCategories((liveCategories) => {
      setCategories(liveCategories);
    });
    const unsubPolicy = subscribeToReturnPolicy((livePolicy) => {
      setReturnPolicy(livePolicy);
    });

    return () => {
      unsubProducts();
      unsubPayment();
      unsubBanners();
      unsubCategories();
      unsubPolicy();
    };
  }, [authSessionKey, syncNonce]);

  const inFlightForceSyncRef = useRef<Promise<void> | null>(null);
  const lastSyncTimestampRef = useRef<number>(Date.now());

  const forceSyncAllState = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (inFlightForceSyncRef.current) {
        return inFlightForceSyncRef.current;
      }

      const task = (async () => {
        setIsSyncingState(true);
        try {
          clearVolatileCaches();
          resetStorefrontSeedFlags();

          const [liveProducts, liveBanners, liveCategories, livePolicy, livePayments] =
            await Promise.all([
              getProducts(true),
              fetchBannersFromServer(),
              fetchCategoriesFromServer(),
              fetchReturnPolicyFromServer(),
              paymentService.getPaymentSettings(true),
              refreshAdminStatus(),
            ]);

          if (Array.isArray(liveProducts)) {
            setProducts(sortProductsForCatalogDisplay(liveProducts));
          }
          if (Array.isArray(liveBanners)) {
            setBanners(liveBanners);
          }
          if (Array.isArray(liveCategories)) {
            setCategories(liveCategories);
          }
          if (livePolicy) {
            setReturnPolicy(livePolicy);
          }
          if (livePayments) {
            setPaymentSettings(livePayments);
          }

          lastSyncTimestampRef.current = Date.now();
          setSyncNonce((n) => n + 1);

          if (!options.silent) {
            addToast({
              type: 'info',
              titleEn: 'Cloud Cache Cleared & Synced',
              titleBn: 'ক্যাশ রিফ্রেশ ও সিঙ্ক সম্পন্ন',
              descriptionEn: 'Latest storefront, roles, and catalog loaded from server.',
              descriptionBn: 'সার্ভার থেকে সর্বশেষ স্টোর, রোল ও ক্যাটালগ তথ্য আপডেট করা হয়েছে।',
            });
          }
        } catch (err) {
          console.warn('[AppContext] forceSyncAllState notice:', err);
        } finally {
          setIsSyncingState(false);
          inFlightForceSyncRef.current = null;
        }
      })();

      inFlightForceSyncRef.current = task;
      return task;
    },
    [refreshAdminStatus, addToast]
  );

  // Automatic stale-snapshot recovery when mobile/desktop browser reconnects or resumes after >60s idle
  useEffect(() => {
    let hiddenAt = 0;

    const handleOnline = () => {
      void forceSyncAllState({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (document.visibilityState === 'visible') {
        const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
        const sinceLastSyncMs = Date.now() - lastSyncTimestampRef.current;
        if (awayMs > 60_000 && sinceLastSyncMs > 90_000) {
          void forceSyncAllState({ silent: true });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [forceSyncAllState]);

  const updateReturnPolicy = async (newPolicy: ReturnPolicyConfig) => {
    try {
      const saved = await fbSaveReturnPolicy(newPolicy, user?.email || 'Admin');
      setReturnPolicy(saved);
      addToast({
        type: 'success',
        titleEn: 'Return Policy Updated',
        titleBn: 'রিটার্ন নীতিমালা সংরক্ষিত হয়েছে',
        descriptionEn: 'Updated 7-day return policy & instructions are now live storewide.',
        descriptionBn: 'নতুন রিটার্ন নীতিমালা স্টোরজুড়ে প্রকাশিত হয়েছে।',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Update Policy',
        titleBn: 'নীতিমালা সংরক্ষণে ব্যর্থ',
        descriptionEn: err?.message || 'Could not update return policy in Firestore.',
      });
      throw err;
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
        reshuffleCatalog,
        addProductToState,
        removeProductFromState,
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
        saveCheckoutProfile: handleSaveCheckoutProfile,
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
        trackingOrderId,
        setTrackingOrderId,
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
        banners,
        addBannerToState,
        removeBannerFromState,
        updateBannerInState,
        categories,
        returnPolicy,
        updateReturnPolicy,
        isReturnPolicyModalOpen,
        setIsReturnPolicyModalOpen,
        isSyncingState,
        forceSyncAllState,
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
