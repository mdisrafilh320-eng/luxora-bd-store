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
} from '../services/storefrontService';

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
      const data = await getProducts();
      if (Array.isArray(data)) {
        setProducts(sortProductsForCatalogDisplay(data));
      }
    } catch (err) {
      console.warn('Failed to load products from Firestore:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    validateFirestoreConnection();
    // Single real-time onSnapshot listener handles initial load + live cloud updates without duplicate full-collection reads
    const unsubscribe = subscribeToProducts((liveProducts) => {
      if (Array.isArray(liveProducts)) {
        setProducts(liveProducts);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  const languageRef = useRef(language);
  languageRef.current = language;

  // Check redirect result and subscribe to Firebase Auth changes (never re-subscribe on language toggle)
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
          const pendingSync = getPendingRegistrationSync(fbUser.uid);
          let profile = pendingSync ? await pendingSync : await getUserProfile(fbUser.uid);
          if (!profile) {
            profile = await syncUserProfile(fbUser, { language: languageRef.current });
          }
          setUser(profile);
          try {
            localStorage.setItem('luxora_user', JSON.stringify(profile));
          } catch {}
        } catch (error) {
          console.warn('Firestore profile lookup fallback activated:', error);
          let fallbackProfile: UserProfile | null = null;
          try {
            const cachedRaw = localStorage.getItem('luxora_user');
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw) as UserProfile;
              if (parsed && parsed.id === fbUser.uid) {
                fallbackProfile = parsed;
              }
            }
          } catch {}

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
        try {
          localStorage.removeItem('luxora_user');
          localStorage.removeItem('luxora_guest_session');
        } catch {
          // ignore
        }
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
    try {
      localStorage.removeItem('luxora_admin_override');
    } catch {}
  }, []);

  const verifyUserAdminStatus = useCallback(async (targetUser: UserProfile | null, authReady: boolean) => {
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
      const res = await adminRbacService.verifyAdminAccess(verifiedEmail, fbUser.uid);
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

  useEffect(() => {
    verifyUserAdminStatus(user, !isAuthLoading);
  }, [user, isAuthLoading, verifyUserAdminStatus]);

  const refreshAdminStatus = async () => {
    await verifyUserAdminStatus(user, !isAuthLoading);
  };

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

  useEffect(() => {
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
      unsubBanners();
      unsubCategories();
      unsubPolicy();
    };
  }, []);

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
