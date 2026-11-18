import { 
  collection, 
  getDocs, 
  getDocsFromServer,
  getDoc, 
  doc, 
  setDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { safeGetJSON, safeRemoveItem, safeSetJSON, STORAGE_KEYS } from '../utils/storage';
import { Product, ProductCategory, ProductSpec } from '../types';
import { mockProducts } from '../data/mockProducts';

export const PRODUCTS_COLLECTION = 'products';
const CACHED_PRODUCTS_STORAGE_KEY = STORAGE_KEYS.CACHED_PRODUCTS;

// Per-visit in-memory random rank map: generates a fresh order on every page load/refresh
// while keeping positions stable during in-page filtering, searching, and modal interactions.
const visitRandomRankMap = new Map<string, number>();

function generateUniformRandom(): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
  } catch {
    // fallback to Math.random
  }
  return Math.random();
}

/**
 * Determine whether a product is unavailable / out of stock.
 */
export function isProductOutOfStock(product: Partial<Product> | null | undefined): boolean {
  if (!product) return true;
  const stock = typeof product.stockCount === 'number' ? product.stockCount : Number(product.stockCount ?? 0);
  return product.inStock === false || !Number.isFinite(stock) || stock <= 0;
}

/**
 * Retrieve (or lazily assign) a random discovery rank for this browser visit.
 */
export function getVisitRandomRank(productId: string): number {
  const key = String(productId || '');
  let rank = visitRandomRankMap.get(key);
  if (rank === undefined) {
    rank = generateUniformRandom();
    visitRandomRankMap.set(key, rank);
  }
  return rank;
}

/**
 * Clear visit ranks and assign fresh Fisher-Yates randomized ranks for all provided IDs.
 */
export function reshuffleVisitCatalogOrder(productIds?: string[]): void {
  visitRandomRankMap.clear();
  if (Array.isArray(productIds) && productIds.length > 0) {
    const shuffled = [...productIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(generateUniformRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const len = shuffled.length;
    shuffled.forEach((id, idx) => {
      visitRandomRankMap.set(String(id), (idx + generateUniformRandom()) / len);
    });
  }
}

/**
 * Fair-visibility storefront sorter:
 * 1. Always pushes out-of-stock items (stock <= 0 or !inStock) to the very bottom.
 * 2. Gives older and newer in-stock products equal randomized visibility on each visit/refresh.
 */
export function sortProductsForCatalogDisplay(items: Product[]): Product[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Seed unseen IDs using unbiased Fisher-Yates batch assignment when initializing
  const unseenIds = items
    .map((p) => String(p.id || ''))
    .filter((id) => id && !visitRandomRankMap.has(id));

  if (unseenIds.length > 1 && visitRandomRankMap.size === 0) {
    reshuffleVisitCatalogOrder(unseenIds);
  } else {
    for (const id of unseenIds) {
      getVisitRandomRank(id);
    }
  }

  return [...items].sort((a, b) => {
    const aOut = isProductOutOfStock(a) ? 1 : 0;
    const bOut = isProductOutOfStock(b) ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;
    return getVisitRandomRank(a.id) - getVisitRandomRank(b.id);
  });
}

/**
 * Generate a realistic, randomized product rating (4.3 - 5.0, rounded to 1 decimal place)
 * and review count (6 - 48) that form a unique combination across the catalog.
 */
export function generateRandomizedRatingMetrics(
  existingProducts?: Array<Pick<Product, 'rating' | 'reviewsCount'>>
): { rating: number; reviewsCount: number } {
  const source = Array.isArray(existingProducts) ? existingProducts : [];
  const usedPairs = new Set<string>(
    source
      .filter((p) => typeof p?.rating === 'number' && typeof p?.reviewsCount === 'number')
      .map((p) => `${Number(p.rating).toFixed(1)}|${Math.round(Number(p.reviewsCount))}`)
  );

  const pickRandomPair = () => {
    const ratingTenths = 43 + Math.floor(generateUniformRandom() * 8); // 43..50 -> 4.3..5.0
    const rating = Number((ratingTenths / 10).toFixed(1));
    const reviewsCount = 6 + Math.floor(generateUniformRandom() * 43); // 6..48
    return { rating, reviewsCount };
  };

  for (let attempt = 0; attempt < 60; attempt++) {
    const candidate = pickRandomPair();
    const key = `${candidate.rating.toFixed(1)}|${candidate.reviewsCount}`;
    if (!usedPairs.has(key)) {
      return candidate;
    }
  }

  // Fallback sweep across all 344 (rating, reviewsCount) combinations if catalog is very large
  const ratings = [4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];
  for (let i = ratings.length - 1; i > 0; i--) {
    const j = Math.floor(generateUniformRandom() * (i + 1));
    [ratings[i], ratings[j]] = [ratings[j], ratings[i]];
  }
  const offset = Math.floor(generateUniformRandom() * 43);
  for (const rating of ratings) {
    for (let step = 0; step < 43; step++) {
      const reviewsCount = 6 + ((offset + step) % 43);
      const key = `${rating.toFixed(1)}|${reviewsCount}`;
      if (!usedPairs.has(key)) {
        return { rating, reviewsCount };
      }
    }
  }

  return pickRandomPair();
}

/**
 * Clean & sanitize a Product payload to guarantee:
 * 1. Zero `undefined` values (which causes Firestore setDoc to fail)
 * 2. All required fields from blueprint and UI are populated
 * 3. Consistent data types (numbers, booleans, strings, arrays)
 */
export function sanitizeProductData(
  input: Partial<Product>,
  fallbackId?: string,
  existingProducts?: Array<Pick<Product, 'rating' | 'reviewsCount'>>
): Product {
  const now = new Date().toISOString();
  const rawId = input.id || fallbackId || `lux-prod-${Date.now().toString(36)}`;
  // Ensure ID complies with Firestore rules: ^[a-zA-Z0-9_.@\-]+$
  const cleanId = rawId.replace(/[^a-zA-Z0-9_.@-]/g, '_');

  const priceNum = Math.max(0, Number(input.price) || 0);
  const origPriceNum = Math.max(priceNum, Number(input.originalPrice) || priceNum);
  const stockNum = Math.max(0, Math.floor(Number(input.stockCount) ?? 10));

  const hasValidRating = typeof input.rating === 'number' && Number.isFinite(input.rating) && input.rating > 0 && input.rating <= 5;
  const hasValidReviews = typeof input.reviewsCount === 'number' && Number.isFinite(input.reviewsCount) && input.reviewsCount > 0;
  const generatedMetrics = (!hasValidRating || !hasValidReviews)
    ? generateRandomizedRatingMetrics(existingProducts)
    : null;

  const finalRating = hasValidRating
    ? Number(Number(input.rating).toFixed(1))
    : generatedMetrics!.rating;
  const finalReviewsCount = hasValidReviews
    ? Math.max(1, Math.round(Number(input.reviewsCount)))
    : generatedMetrics!.reviewsCount;

  const specsList: ProductSpec[] = Array.isArray(input.specs) 
    ? input.specs.map((s) => ({
        labelEn: String(s.labelEn || ''),
        labelBn: String(s.labelBn || s.labelEn || ''),
        valueEn: String(s.valueEn || ''),
        valueBn: String(s.valueBn || s.valueEn || ''),
      }))
    : [];

  const rawGallery = Array.isArray(input.gallery) ? input.gallery : [];
  const cleanGallery = rawGallery.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);

  const cleanProduct: Product = {
    id: cleanId,
    nameEn: (input.nameEn || '').trim() || 'Luxora Flagship Edition',
    nameBn: (input.nameBn || '').trim() || (input.nameEn || '').trim() || 'লাক্সোরা ফ্ল্যাগশিপ পণ্য',
    taglineEn: (input.taglineEn || '').trim(),
    taglineBn: (input.taglineBn || '').trim(),
    brand: (input.brand || '').trim() || 'Luxora Prime',
    category: (input.category || 'audio') as ProductCategory,
    freeDelivery: Boolean(input.freeDelivery || input.category === 'free-delivery'),
    price: priceNum,
    originalPrice: origPriceNum,
    rating: finalRating,
    reviewsCount: finalReviewsCount,
    inStock: stockNum > 0,
    stockCount: stockNum,
    image: (input.image || '').trim(),
    gallery: cleanGallery,
    descriptionEn: (input.descriptionEn || '').trim() || 'Exquisite luxury craftsmanship with official Bangladesh warranty.',
    descriptionBn: (input.descriptionBn || '').trim() || 'অফিসিয়াল বাংলাদেশ ওয়ারেন্টি সহ সেরা লাক্সারি অভিজ্ঞতা।',
    specs: specsList,
    warrantyEn: (input as any).warrantyEn || (input as any).warranty || '2 Years Official Luxora Bangladesh Warranty',
    warrantyBn: (input as any).warrantyBn || '২ বছরের অফিসিয়াল লাক্সোরা বাংলাদেশ ওয়ারেন্টি',
    returnPolicyEn: (input as any).returnPolicyEn || (input as any).returnPolicy || '7 Days Replacement Guarantee',
    returnPolicyBn: (input as any).returnPolicyBn || '৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি',
    badge: input.badge || 'new',
    isFeatured: Boolean(input.isFeatured),
    colors: Array.isArray(input.colors) ? input.colors : [],
    sizes: Array.isArray(input.sizes) ? input.sizes : [],
    variants: Array.isArray(input.variants) ? input.variants : [],
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  return cleanProduct;
}

export function clearProductCache(): void {
  safeRemoveItem(CACHED_PRODUCTS_STORAGE_KEY);
}

/**
 * Retrieve local cached catalog from safe storage
 */
export function getLocalCachedProducts(): Product[] {
  const parsed = safeGetJSON<Product[] | null>(CACHED_PRODUCTS_STORAGE_KEY, null);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return mockProducts;
}

/**
 * Persist products catalog to local storage cache with size guard
 */
export function setLocalCachedProducts(products: Product[]): void {
  if (!Array.isArray(products)) return;
  if (products.length === 0) {
    safeSetJSON(CACHED_PRODUCTS_STORAGE_KEY, []);
    return;
  }

  // Strip oversized inline data URLs inside secondary galleries if catalog is heavy
  const serializedOk = safeSetJSON(CACHED_PRODUCTS_STORAGE_KEY, products, 750_000);
  if (!serializedOk) {
    const lightweight = products.map((p) => ({
      ...p,
      gallery: Array.isArray(p.gallery)
        ? p.gallery.filter((u) => typeof u === 'string' && !u.startsWith('data:'))
        : [],
      image:
        typeof p.image === 'string' && p.image.startsWith('data:') && p.image.length > 60_000
          ? ''
          : p.image,
    }));
    safeSetJSON(CACHED_PRODUCTS_STORAGE_KEY, lightweight, 750_000);
  }
}

/**
 * Subscribe in real time to the Firestore products catalog.
 * Fires immediately upon snapshot change, ensuring instant updates across all views.
 */
export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          items.push({ ...data, id: data?.id || docSnap.id });
        });

        // Always update with live cloud items (dynamically shuffled per visit, stock-out at bottom)
        if (items.length > 0) {
          setLocalCachedProducts(items);
          onUpdate(sortProductsForCatalogDisplay(items));
        } else {
          // If primary collection is empty, check alias collection
          getDocs(collection(db, 'luxora-products'))
            .then((altSnap) => {
              if (!altSnap.empty) {
                const altItems: Product[] = [];
                altSnap.forEach((d) => {
                  const data = d.data() as Product;
                  altItems.push({ ...data, id: data?.id || d.id });
                });
                setLocalCachedProducts(altItems);
                onUpdate(sortProductsForCatalogDisplay(altItems));
              } else {
                // Cloud catalog is genuinely empty (all products deleted) -> clear cache & show empty
                setLocalCachedProducts([]);
                onUpdate([]);
              }
            })
            .catch(() => {
              const cached = getLocalCachedProducts();
              onUpdate(sortProductsForCatalogDisplay(cached));
            });
        }
      },
      (error) => {
        console.warn('Real-time products subscription warning:', error);
        if (onError) onError(error);
        const cached = getLocalCachedProducts();
        onUpdate(sortProductsForCatalogDisplay(cached));
      }
    );
  } catch (err: any) {
    console.error('Failed to set up real-time products listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch all available products from Firestore catalog
 */
export async function getProducts(forceServer = false): Promise<Product[]> {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    let snap;
    if (forceServer) {
      try {
        snap = await getDocsFromServer(colRef);
      } catch {
        snap = await getDocs(colRef);
      }
    } else {
      snap = await getDocs(colRef);
    }
    
    if (snap.empty) {
      // Check alias collection 'luxora-products'
      try {
        const altRef = collection(db, 'luxora-products');
        const altSnap = forceServer
          ? await getDocsFromServer(altRef).catch(() => getDocs(altRef))
          : await getDocs(altRef);
        if (!altSnap.empty) {
          const altItems: Product[] = [];
          altSnap.forEach((docSnap) => {
            const data = docSnap.data() as Product;
            altItems.push({ ...data, id: data?.id || docSnap.id });
          });
          setLocalCachedProducts(altItems);
          return sortProductsForCatalogDisplay(altItems);
        }
        // Both cloud collections are empty -> clear local cache
        setLocalCachedProducts([]);
        return [];
      } catch {
        return sortProductsForCatalogDisplay(getLocalCachedProducts());
      }
    }
    
    const items: Product[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      items.push({ ...data, id: data?.id || docSnap.id });
    });

    setLocalCachedProducts(items);
    return sortProductsForCatalogDisplay(items);
  } catch (error: any) {
    console.warn('Catalog fetch warning, falling back to cache:', error);
    return sortProductsForCatalogDisplay(getLocalCachedProducts());
  }
}

/**
 * Fetch a single product by SKU / ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const cleanId = id.replace(/[^a-zA-Z0-9_.@-]/g, '_');
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Product;
      return { ...data, id: data?.id || snap.id };
    }

    // Check alias collection 'luxora-products'
    try {
      const aliasRef = doc(db, 'luxora-products', cleanId);
      const aliasSnap = await getDoc(aliasRef);
      if (aliasSnap.exists()) {
        const data = aliasSnap.data() as Product;
        return { ...data, id: data?.id || aliasSnap.id };
      }
    } catch {
      // ignore alias lookup errors
    }

    // Check local cache
    const cached = getLocalCachedProducts();
    const found = cached.find((p) => p.id === id || p.id === cleanId);
    return found || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PRODUCTS_COLLECTION}/${id}`);
    return null;
  }
}

/**
 * Fetch products filtered by category
 */
export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  if (category === 'all') {
    return getProducts();
  }
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(colRef, where('category', '==', category));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      const cached = getLocalCachedProducts();
      return sortProductsForCatalogDisplay(cached.filter((p) => p.category === category));
    }
    
    const items: Product[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as Product);
    });
    return sortProductsForCatalogDisplay(items);
  } catch (error) {
    console.warn('Category fetch error, using cache:', error);
    const cached = getLocalCachedProducts();
    return sortProductsForCatalogDisplay(cached.filter((p) => p.category === category));
  }
}

/**
 * Seed initial catalog into Firestore if requested
 */
export async function seedInitialCatalogIfEmpty(): Promise<void> {
  // Retained as manual opt-in
}

/**
 * Clear all products from Firestore catalog (Admin Reset)
 */
export async function clearAllProducts(): Promise<void> {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
    setLocalCachedProducts([]);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, PRODUCTS_COLLECTION);
  }
}

/**
 * Add or create a new luxury product (Admin ERP)
 * Performs strict sanitization, saves to `products` collection, verifies write acknowledgment,
 * and updates local cache immediately.
 */
export async function addProduct(productData: Partial<Product>): Promise<Product> {
  const existingCatalog = getLocalCachedProducts();
  const cleanProduct = sanitizeProductData(productData, undefined, existingCatalog);

  // Validate essential fields before database write
  if (!cleanProduct.nameEn) {
    throw new Error('Product English Title is mandatory.');
  }
  if (!cleanProduct.price || cleanProduct.price <= 0) {
    throw new Error('Valid Product Price is mandatory.');
  }
  if (!cleanProduct.image) {
    throw new Error('Product must have at least one valid cover image URL.');
  }

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanProduct.id);
    
    // Save document to primary Firestore collection
    await setDoc(docRef, cleanProduct);

    // Also mirror to alias collection 'luxora-products' for global compatibility
    try {
      const aliasRef = doc(db, 'luxora-products', cleanProduct.id);
      await setDoc(aliasRef, cleanProduct);
    } catch (aliasErr) {
      console.warn('luxora-products mirror notice:', aliasErr);
    }

    // Verify document was written by checking snapshot
    const verifySnap = await getDoc(docRef);
    if (!verifySnap.exists()) {
      throw new Error(`Product document ${cleanProduct.id} was not confirmed in Firestore collection '${PRODUCTS_COLLECTION}'.`);
    }

    // Immediately update local cached catalog so it shows without requiring refresh
    const currentCached = getLocalCachedProducts();
    const updated = [cleanProduct, ...currentCached.filter((p) => p.id !== cleanProduct.id)];
    setLocalCachedProducts(updated);

    return cleanProduct;
  } catch (error: any) {
    console.error('Error in addProduct:', error);

    // Provide clear error message for permission denial or authentication issues
    const rawMsg = error?.message || String(error);
    if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
      const currentEmail = auth.currentUser?.email || 'unauthenticated';
      throw new Error(
        `Permission Denied by Firestore Security Rules. You must be authenticated as an authorized Admin or Super Admin (Current: ${currentEmail}).`
      );
    }

    handleFirestoreError(error, OperationType.CREATE, `${PRODUCTS_COLLECTION}/${cleanProduct.id}`);
    throw error;
  }
}

/**
 * Update existing product details (Admin ERP)
 */
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
  const cleanId = productId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
  const now = new Date().toISOString();

  // Retrieve current product first to merge
  const current = await getProductById(cleanId);
  const mergedData: Partial<Product> = {
    ...(current || {}),
    ...updates,
    id: cleanId,
    updatedAt: now,
  };

  const cleanProduct = sanitizeProductData(mergedData, cleanId);

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanId);
    await setDoc(docRef, cleanProduct, { merge: true });

    try {
      const aliasRef = doc(db, 'luxora-products', cleanId);
      await setDoc(aliasRef, cleanProduct, { merge: true });
    } catch {}

    // Update local cache
    const currentCached = getLocalCachedProducts();
    const updated = currentCached.map((p) => (p.id === cleanId ? cleanProduct : p));
    if (!updated.some((p) => p.id === cleanId)) {
      updated.unshift(cleanProduct);
    }
    setLocalCachedProducts(updated);

    return cleanProduct;
  } catch (error: any) {
    console.error('Error in updateProduct:', error);
    const rawMsg = error?.message || String(error);
    if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
      throw new Error('Permission Denied by Firestore. Super Admin or Admin role required.');
    }
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

/**
 * Update stock count and auto-adjust inStock flag (Admin ERP)
 */
export async function updateProductStock(productId: string, newStock: number): Promise<void> {
  const cleanId = productId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
  const now = new Date().toISOString();
  const safeStock = Math.max(0, Math.floor(newStock));

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanId);
    await setDoc(
      docRef,
      {
        stockCount: safeStock,
        inStock: safeStock > 0,
        updatedAt: now,
      },
      { merge: true }
    );

    try {
      const aliasRef = doc(db, 'luxora-products', cleanId);
      await setDoc(
        aliasRef,
        {
          stockCount: safeStock,
          inStock: safeStock > 0,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch {}

    // Update local cache
    const currentCached = getLocalCachedProducts();
    const updated = currentCached.map((p) =>
      p.id === cleanId ? { ...p, stockCount: safeStock, inStock: safeStock > 0, updatedAt: now } : p
    );
    setLocalCachedProducts(updated);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${cleanId}`);
  }
}

/**
 * Delete a product from the catalog (Admin ERP)
 * Deletes from `products/{productId}` (plus `luxora-products` mirror and local cache)
 */
export async function deleteProduct(productId: string): Promise<void> {
  const cleanId = productId.replace(/[^a-zA-Z0-9_.@-]/g, '_');

  // Remove from local cache immediately for instant UI consistency
  const currentCached = getLocalCachedProducts();
  const updatedCache = currentCached.filter((p) => p.id !== cleanId && p.id !== productId);
  setLocalCachedProducts(updatedCache);

  try {
    const deleteTasks: Promise<any>[] = [
      deleteDoc(doc(db, PRODUCTS_COLLECTION, cleanId)),
    ];

    if (productId !== cleanId) {
      deleteTasks.push(deleteDoc(doc(db, PRODUCTS_COLLECTION, productId)));
    }

    // Also delete from mirror collection
    deleteTasks.push(deleteDoc(doc(db, 'luxora-products', cleanId)).catch(() => {}));
    if (productId !== cleanId) {
      deleteTasks.push(deleteDoc(doc(db, 'luxora-products', productId)).catch(() => {}));
    }

    // Watchdog in case any secondary deletion hangs, primary products/{id} is awaited cleanly
    await Promise.all(deleteTasks);

    // Double check if any doc with matching `id` field existed under an auto-generated docId
    try {
      const q = query(collection(db, PRODUCTS_COLLECTION), where('id', '==', productId));
      const matchedSnap = await getDocs(q);
      for (const matchedDoc of matchedSnap.docs) {
        await deleteDoc(matchedDoc.ref);
      }
    } catch {}
  } catch (error: any) {
    console.error('Error in deleteProduct:', error);
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

export const productService = {
  getProducts,
  getProductById,
  getProductsByCategory,
  subscribeToProducts,
  seedInitialCatalogIfEmpty,
  clearAllProducts,
  addProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  sanitizeProductData,
  generateRandomizedRatingMetrics,
  getLocalCachedProducts,
  setLocalCachedProducts,
  isProductOutOfStock,
  getVisitRandomRank,
  reshuffleVisitCatalogOrder,
  sortProductsForCatalogDisplay,
};

