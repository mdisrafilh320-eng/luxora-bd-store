import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, ProductCategory } from '../types';
import { mockProducts } from '../data/mockProducts';

const PRODUCTS_COLLECTION = 'products';

/**
 * Fetch all available products from Firestore catalog
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
      return [];
    }
    
    const items: Product[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as Product);
    });
    return items;
  } catch (error) {
    console.warn('Catalog empty or falling back:', error);
    return [];
  }
}

/**
 * Fetch a single product by SKU / ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Product;
    }
    return null;
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
      return [];
    }
    
    const items: Product[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as Product);
    });
    return items;
  } catch (error) {
    console.warn('Category fetch error:', error);
    return [];
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
    const { deleteDoc } = await import('firebase/firestore');
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, PRODUCTS_COLLECTION);
  }
}

/**
 * Add or create a new luxury product (Admin ERP)
 */
export async function addProduct(productData: Omit<Product, 'createdAt' | 'updatedAt'>): Promise<Product> {
  const now = new Date().toISOString();
  const newProduct: Product = {
    ...productData,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, newProduct.id);
    await setDoc(docRef, newProduct);
    return newProduct;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PRODUCTS_COLLECTION}/${newProduct.id}`);
  }
}

/**
 * Update existing product details (Admin ERP)
 */
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await setDoc(docRef, { ...updates, updatedAt: now }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Update stock count and auto-adjust inStock flag (Admin ERP)
 */
export async function updateProductStock(productId: string, newStock: number): Promise<void> {
  const now = new Date().toISOString();
  const safeStock = Math.max(0, Math.floor(newStock));
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await setDoc(docRef, {
      stockCount: safeStock,
      inStock: safeStock > 0,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

/**
 * Delete a product from the catalog (Admin ERP)
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COLLECTION}/${productId}`);
  }
}

export const productService = {
  getProducts,
  getProductById,
  getProductsByCategory,
  seedInitialCatalogIfEmpty,
  clearAllProducts,
  addProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
};

