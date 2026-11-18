/**
 * Luxora BD — Quota-Resilient, Versioned Local Storage & Cache Manager
 *
 * Ensures individual browsers/mobile devices never get stuck on stale schemas,
 * cross-account leftovers, or unhandled QuotaExceededError / SecurityError exceptions.
 */

export const LUXORA_CACHE_VERSION = '2026-05-sync-v1';

export const STORAGE_KEYS = {
  CACHE_VERSION: 'luxora_cache_version',
  USER: 'luxora_user',
  GUEST_SESSION: 'luxora_guest_session',
  ADMIN_OVERRIDE: 'luxora_admin_override',
  LANG: 'luxora_lang',
  CART: 'luxora_cart',
  WISHLIST: 'luxora_wishlist',
  CACHED_PRODUCTS: 'luxora_cached_products',
  CACHED_BANNERS: 'luxora_cached_banners',
  BANNERS_USER_MANAGED: 'luxora_banners_user_managed',
  CACHED_CATEGORIES: 'luxora_cached_categories',
  CACHED_RETURN_POLICY: 'luxora_cached_return_policy',
  CACHED_PAYMENT_SETTINGS: 'luxora_cached_payment_settings',
  CACHED_ORDERS: 'luxora_cached_orders',
  WEBCHAT_PHONE: 'luxora_webchat_phone',
} as const;

export const VOLATILE_CACHE_KEYS: readonly string[] = [
  STORAGE_KEYS.CACHED_PRODUCTS,
  STORAGE_KEYS.CACHED_BANNERS,
  STORAGE_KEYS.BANNERS_USER_MANAGED,
  STORAGE_KEYS.CACHED_CATEGORIES,
  STORAGE_KEYS.CACHED_RETURN_POLICY,
  STORAGE_KEYS.CACHED_PAYMENT_SETTINGS,
  STORAGE_KEYS.CACHED_ORDERS,
];

export const SESSION_CACHE_KEYS: readonly string[] = [
  STORAGE_KEYS.USER,
  STORAGE_KEYS.GUEST_SESSION,
  STORAGE_KEYS.ADMIN_OVERRIDE,
  STORAGE_KEYS.CACHED_ORDERS,
];

// Fallback in-memory store when browser blocks localStorage (e.g., strict Safari WebView / Private mode)
const memoryFallbackStore = new Map<string, string>();
let cacheInitialized = false;

export function isStorageQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; code?: number; message?: string };
  const name = String(err.name || '');
  const message = String(err.message || '').toLowerCase();
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    message.includes('quota')
  );
}

function getNativeLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Blocked by browser privacy settings
  }
  return null;
}

export function safeRemoveItem(key: string): void {
  memoryFallbackStore.delete(key);
  const ls = getNativeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearVolatileCaches(exceptKey?: string): void {
  for (const key of VOLATILE_CACHE_KEYS) {
    if (key !== exceptKey) {
      safeRemoveItem(key);
    }
  }
}

export function clearSessionCaches(): void {
  for (const key of SESSION_CACHE_KEYS) {
    safeRemoveItem(key);
  }
}

export function clearAllAppCaches(options: { preserveCart?: boolean } = {}): void {
  const preservedLang = safeGetItem(STORAGE_KEYS.LANG);
  const preservedCart = options.preserveCart ? safeGetItem(STORAGE_KEYS.CART) : null;
  const preservedWishlist = options.preserveCart ? safeGetItem(STORAGE_KEYS.WISHLIST) : null;

  clearVolatileCaches();
  clearSessionCaches();
  safeRemoveItem(STORAGE_KEYS.WEBCHAT_PHONE);

  if (!options.preserveCart) {
    safeRemoveItem(STORAGE_KEYS.CART);
    safeRemoveItem(STORAGE_KEYS.WISHLIST);
  } else {
    if (preservedCart) safeSetItem(STORAGE_KEYS.CART, preservedCart);
    if (preservedWishlist) safeSetItem(STORAGE_KEYS.WISHLIST, preservedWishlist);
  }

  if (preservedLang) {
    safeSetItem(STORAGE_KEYS.LANG, preservedLang);
  }
  safeSetItem(STORAGE_KEYS.CACHE_VERSION, LUXORA_CACHE_VERSION);
}

export function safeGetItem(key: string): string | null {
  const ls = getNativeLocalStorage();
  if (ls) {
    try {
      const val = ls.getItem(key);
      if (val !== null) return val;
    } catch {
      // fall through to memory fallback
    }
  }
  return memoryFallbackStore.get(key) ?? null;
}

export function safeSetItem(key: string, value: string, maxBytes = 900_000): boolean {
  if (value.length > maxBytes) {
    // Prevent a single oversized cache entry (e.g., inline base64 blobs) from exhausting device quota
    memoryFallbackStore.set(key, value);
    safeRemoveItem(key);
    memoryFallbackStore.set(key, value);
    return false;
  }

  memoryFallbackStore.set(key, value);
  const ls = getNativeLocalStorage();
  if (!ls) return false;

  try {
    ls.setItem(key, value);
    return true;
  } catch (err) {
    if (isStorageQuotaError(err)) {
      // Evict volatile caches and retry once
      clearVolatileCaches(key);
      try {
        ls.setItem(key, value);
        return true;
      } catch {
        // Still over quota — keep in memory fallback and drop stale disk copy
        try {
          ls.removeItem(key);
        } catch {}
      }
    }
    return false;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed === undefined || parsed === null) ? fallback : (parsed as T);
  } catch {
    // Corrupted JSON entry — purge automatically so future boots don't fail
    safeRemoveItem(key);
    return fallback;
  }
}

export function safeSetJSON<T>(key: string, value: T, maxBytes = 850_000): boolean {
  try {
    const serialized = JSON.stringify(value);
    return safeSetItem(key, serialized, maxBytes);
  } catch {
    return false;
  }
}

/**
 * Initialize schema-versioned cache on boot.
 * If the client had an older cache schema, automatically flush volatile/role caches
 * while keeping verified language, cart, and wishlist preferences intact.
 */
export function initVersionedCache(): void {
  if (cacheInitialized) return;
  cacheInitialized = true;

  try {
    safeRemoveItem(STORAGE_KEYS.ADMIN_OVERRIDE);
    const currentVersion = safeGetItem(STORAGE_KEYS.CACHE_VERSION);
    if (currentVersion !== LUXORA_CACHE_VERSION) {
      clearVolatileCaches();
      safeSetItem(STORAGE_KEYS.CACHE_VERSION, LUXORA_CACHE_VERSION);
    }
  } catch {
    // ignore non-fatal init issues
  }
}
