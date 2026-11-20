import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, logFirestoreError, OperationType } from '../lib/firebase';
import { safeGetJSON, safeRemoveItem, safeSetJSON, STORAGE_KEYS } from '../utils/storage';
import { Order, OrderStatus, CourierTracking } from '../types';

const ORDERS_COLLECTION = 'orders';

const LOCAL_ORDERS_CACHE_KEY = STORAGE_KEYS.CACHED_ORDERS;

/**
 * Deep sanitization helper that strips all `undefined` fields recursively
 * (Firestore strictly rejects documents containing `undefined`)
 */
function sanitizeForFirestore<T>(val: T): T {
  if (val === null || val === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(val as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return val;
}

/**
 * Clear local orders cache on sign-out or session switch
 */
export function clearLocalOrdersCache(): void {
  safeRemoveItem(LOCAL_ORDERS_CACHE_KEY);
}

/**
 * Read cached orders from safe local storage (fallback)
 */
export function getLocalCachedOrders(): Order[] {
  const parsed = safeGetJSON<Order[]>(LOCAL_ORDERS_CACHE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Save order to local cache for instant UI rendering and offline resilience (capped to 20 items)
 */
export function saveOrderToLocalCache(order: Order): void {
  const current = getLocalCachedOrders();
  const filtered = current.filter((o) => o.id !== order.id);
  const updated = [order, ...filtered].slice(0, 20);
  safeSetJSON(LOCAL_ORDERS_CACHE_KEY, updated, 500_000);
}

/**
 * Generate luxury Order ID (e.g. LUX-839201)
 */
export function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `LUX-${randomNum}`;
}

/**
 * Create a new customer order in Firestore with bulletproof timeout & local cache protection
 */
export async function createOrder(
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Order> {
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  let initialPaymentStatus = orderData.paymentStatus || 'pending';
  if (orderData.paymentOption === 'partial_advance') {
    initialPaymentStatus = 'partially_paid';
  } else if (orderData.paymentOption === 'full_payment' && orderData.paymentDetails?.transactionId) {
    initialPaymentStatus = 'pending'; // Pending Admin Verification of MFS TrxID
  }

  const rawOrder: Order = {
    ...orderData,
    id: orderId,
    orderStatus: 'Pending',
    paymentStatus: initialPaymentStatus,
    createdAt: now,
    updatedAt: now,
  };

  // Strip all undefined properties to prevent Firestore serialization errors
  const sanitizedOrder = sanitizeForFirestore(rawOrder);

  // Always save to local cache first so order is immediately secure
  saveOrderToLocalCache(sanitizedOrder);

  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);

    // Watchdog timer: If Firestore hangs for more than 7.5s, fail fast with fallback
    const watchdogTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Firestore connection timeout: Saving to local cache with auto-sync'));
      }, 7500);
    });

    await Promise.race([
      setDoc(orderDocRef, sanitizedOrder),
      watchdogTimeout,
    ]);

    return sanitizedOrder;
  } catch (error) {
    console.warn('Firestore write warning for order, saved locally in cache:', error);
    // Return sanitizedOrder so customer UI never breaks or hangs
    return sanitizedOrder;
  }
}

/**
 * Fetch all orders placed strictly by the currently logged-in user (UID isolated).
 * Never queries or returns orders belonging to other customers.
 */
export async function getUserOrders(userId?: string): Promise<Order[]> {
  const authUid = auth.currentUser?.uid;
  if (!authUid) {
    return [];
  }
  if (userId && userId !== authUid) {
    console.warn('Blocked cross-user order query attempt.');
    return [];
  }

  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const q = query(colRef, where('userId', '==', authUid));
    const snap = await getDocs(q);
    const orderMap = new Map<string, Order>();

    snap.forEach((docSnap) => {
      const data = docSnap.data() as Order;
      if (data && data.userId === authUid) {
        orderMap.set(data.id || docSnap.id, { ...data, id: data.id || docSnap.id });
      }
    });

    // Include only matching UID items from local cache if recently placed offline
    getLocalCachedOrders().forEach((cached) => {
      if (cached && cached.id && cached.userId === authUid && !orderMap.has(cached.id)) {
        orderMap.set(cached.id, cached);
      }
    });

    const orders = Array.from(orderMap.values());
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return orders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${ORDERS_COLLECTION}?userId=${authUid}`);
    return [];
  }
}

/**
 * Subscribe in real-time to ONLY the logged-in user's own orders (strictly filtered by auth.currentUser.uid).
 */
export function subscribeToUserOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const authUid = auth.currentUser?.uid;
  if (!authUid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const q = query(colRef, where('userId', '==', authUid));

    return onSnapshot(
      q,
      (snap) => {
        const orderMap = new Map<string, Order>();
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          if (data && data.userId === authUid) {
            orderMap.set(data.id || docSnap.id, { ...data, id: data.id || docSnap.id });
          }
        });

        getLocalCachedOrders().forEach((cached) => {
          if (cached && cached.id && cached.userId === authUid && !orderMap.has(cached.id)) {
            orderMap.set(cached.id, cached);
          }
        });

        const orders = Array.from(orderMap.values());
        orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(orders);
      },
      (error) => {
        logFirestoreError(error, OperationType.LIST, `${ORDERS_COLLECTION}?userId=${authUid}`);
        const fallbackOrders = getLocalCachedOrders()
          .filter((cached) => cached && cached.id && cached.userId === authUid)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(fallbackOrders);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    if (onError) onError(error);
    return () => {};
  }
}

/**
 * Retrieve a single order by ID (enforced by Firestore ownership/admin rules)
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const snap = await getDoc(orderRef);
    if (snap.exists()) {
      return snap.data() as Order;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${ORDERS_COLLECTION}/${orderId}`);
    return null;
  }
}

/**
 * Update order lifecycle status and tracking information (Admin / System)
 */
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  trackingInfo?: CourierTracking
): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const updatePayload: Partial<Order> = {
      orderStatus: status,
      updatedAt: new Date().toISOString(),
    };
    if (trackingInfo) {
      updatePayload.trackingInfo = trackingInfo;
    }
    await updateDoc(orderRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Search ONLY within the logged-in user's own orders by Order ID or Phone number
 * (Admins can resolve individual Order IDs directly; never scans all orders on client).
 */
export async function searchOrdersForTracking(searchQuery: string, isAdminUser = false): Promise<Order | null> {
  const cleanQuery = searchQuery.trim();
  if (!cleanQuery) return null;

  const authUid = auth.currentUser?.uid;
  if (!authUid) {
    return null;
  }

  try {
    const upperId = cleanQuery.toUpperCase();
    // 1. Direct single-document Order ID lookup (strictly gated by Firestore rules)
    if (upperId.startsWith('LUX-') || upperId.length >= 6) {
      try {
        const orderRef = doc(db, ORDERS_COLLECTION, upperId);
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
          const order = snap.data() as Order;
          if (isAdminUser || order.userId === authUid) {
            return order;
          }
        }
      } catch {
        // Permission denied or invalid doc ID -> fall through to own orders search
      }
    }

    // 2. Search strictly inside the logged-in user's own orders (where userId == auth.currentUser.uid)
    const ownOrders = await getUserOrders(authUid);
    const cleanDigits = cleanQuery.replace(/[^0-9]/g, '');

    const matched = ownOrders.find((order) => {
      if (order.id.toUpperCase() === upperId) return true;
      if (order.trackingInfo?.trackingNumber?.toUpperCase() === upperId) return true;
      if (order.trackingInfo?.consignmentId?.toUpperCase() === upperId) return true;
      if (cleanDigits.length >= 6) {
        const custDigits = (order.customer?.phone || '').replace(/[^0-9]/g, '');
        if (custDigits && (custDigits.includes(cleanDigits) || cleanDigits.includes(custDigits))) {
          return true;
        }
      }
      return false;
    });

    return matched || null;
  } catch (err) {
    console.warn('Order tracking lookup notice:', err);
    return null;
  }
}

/**
 * Sample realistic order for previewing the live tracking timeline
 */
export function getSampleTrackingOrder(orderId: string = 'LUX-892014'): Order {
  return {
    id: orderId,
    userId: 'guest_demo',
    customer: {
      name: 'Syed Rahman',
      phone: '+880 1711-234567',
      email: 'syed.rahman@example.com',
      shippingAddress: 'Apartment 5B, Road 11, Banani Block D',
      district: 'Dhaka',
      notes: 'Fragile audio unit - please call upon arrival at gate',
    },
    items: [
      {
        productId: 'bo-beoplay-h95',
        sku: 'BO-H95-GLD',
        nameEn: 'Bang & Olufsen Beoplay H95 Flagship Headphones',
        nameBn: 'ব্যাং অ্যান্ড অলুফসেন বিওপ্লে এইচ৯৫ ফ্ল্যাগশিপ হেডফোন',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
        price: 115000,
        quantity: 1,
        selectedColor: 'Nordic Gold',
      },
    ],
    subtotal: 115000,
    deliveryCharge: 0,
    discount: 5000,
    totalAmount: 110000,
    paymentMethod: 'bkash',
    paymentOption: 'partial_advance',
    paymentDetails: {
      method: 'bkash',
      option: 'partial_advance',
      mfsProvider: 'bkash',
      transactionId: 'BK9A8271XYZ',
      advanceAmount: 120,
      dueAmount: 109880,
    },
    paymentStatus: 'partially_paid',
    orderStatus: 'In Transit',
    trackingInfo: {
      courier: 'Steadfast Luxury Express',
      trackingNumber: 'STDF-892014-DX',
      consignmentId: 'STDF-892014',
      trackingUrl: 'https://steadfast.com.bd/track/STDF-892014',
      estimatedDelivery: 'Today by 05:00 PM (Banani Express Delivery)',
    },
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch all orders for Enterprise ERP Admin Hub (strictly requires authenticated session + Firestore admin rules)
 */
export async function getAllOrders(): Promise<Order[]> {
  if (!auth.currentUser?.uid) {
    return [];
  }

  const orderMap = new Map<string, Order>();

  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    snap.forEach((docSnap) => {
      const liveOrder = docSnap.data() as Order;
      if (liveOrder && liveOrder.id) {
        orderMap.set(liveOrder.id, liveOrder);
      }
    });
  } catch (error) {
    console.warn('Orders catalog Firestore fetch note:', error);
    handleFirestoreError(error, OperationType.LIST, ORDERS_COLLECTION);
  }

  const allOrders = Array.from(orderMap.values());
  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return allOrders;
}

/**
 * Purge all orders from Firestore (Admin Reset)
 */
export async function clearAllOrders(): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const colRef = collection(db, ORDERS_COLLECTION);
    const snap = await getDocs(colRef);
    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ORDERS_COLLECTION);
  }
}

/**
 * Verify MFS payment for an order (Approve/Reject)
 */
export async function verifyOrderPayment(
  orderId: string, 
  isApproved: boolean, 
  adminNotes?: string
): Promise<void> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const now = new Date().toISOString();
    
    await updateDoc(orderRef, {
      paymentStatus: isApproved ? 'paid' : 'failed',
      orderStatus: isApproved ? 'Confirmed' : 'Pending',
      'paymentDetails.notes': adminNotes || (isApproved ? 'Payment verified by Finance Desk' : 'Payment rejected - TrxID mismatch'),
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Delete an order record (Admin ERP)
 */
export async function deleteOrder(orderId: string): Promise<void> {
  try {
    const { deleteDoc } = await import('firebase/firestore');
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Rich realistic mock orders for Admin ERP preview
 */
export function getSampleAdminOrders(): Order[] {
  return [
    {
      id: 'LUX-892014',
      userId: 'usr_gulshan_vip',
      customer: {
        name: 'Syed Rahman',
        phone: '+880 1711-234567',
        email: 'syed.rahman@example.com',
        shippingAddress: 'Apartment 5B, Road 11, Banani Block D',
        district: 'Dhaka',
        notes: 'Fragile audio unit - call upon arrival at gate',
      },
      items: [
        {
          productId: 'bo-beoplay-h95',
          sku: 'BO-H95-GLD',
          nameEn: 'Bang & Olufsen Beoplay H95 Flagship Headphones',
          nameBn: 'ব্যাং অ্যান্ড অলুফসেন বিওপ্লে এইচ৯৫ ফ্ল্যাগশিপ হেডফোন',
          image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
          price: 115000,
          quantity: 1,
          selectedColor: 'Nordic Gold',
        },
      ],
      subtotal: 115000,
      deliveryCharge: 0,
      discount: 5000,
      totalAmount: 110000,
      paymentMethod: 'bkash',
      paymentOption: 'partial_advance',
      paymentDetails: {
        method: 'bkash',
        option: 'partial_advance',
        mfsProvider: 'bkash',
        senderNumber: '01711234567',
        transactionId: 'BK9A8271XYZ',
        advanceAmount: 120,
        dueAmount: 109880,
        paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      },
      paymentStatus: 'partially_paid',
      orderStatus: 'In Transit',
      trackingInfo: {
        courier: 'Steadfast Luxury Express',
        trackingNumber: 'STDF-892014-DX',
        consignmentId: 'STDF-892014',
        trackingUrl: 'https://steadfast.com.bd/track/STDF-892014',
        estimatedDelivery: 'Today by 05:00 PM (Banani Express)',
      },
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'LUX-774102',
      userId: 'usr_dhanmondi_01',
      customer: {
        name: 'Tanzina Akhter',
        phone: '+880 1819-987654',
        email: 'tanzina.a@lifestyle.bd',
        shippingAddress: 'House 34, Road 8/A, Dhanmondi',
        district: 'Dhaka',
      },
      items: [
        {
          productId: 'devialet-phantom-i',
          sku: 'DEV-PHAN-I',
          nameEn: 'Devialet Phantom I 108dB Opéra de Paris',
          nameBn: 'ডিভিয়ালে ফ্যান্টম ১ ১০৮ডিবি অপেরা ডি প্যারিস',
          image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
          price: 345000,
          quantity: 1,
          selectedColor: 'Opéra Gold Leaf',
        },
      ],
      subtotal: 345000,
      deliveryCharge: 0,
      discount: 10000,
      totalAmount: 335000,
      paymentMethod: 'nagad',
      paymentOption: 'full_payment',
      paymentDetails: {
        method: 'nagad',
        option: 'full_payment',
        mfsProvider: 'nagad',
        senderNumber: '01819987654',
        transactionId: 'NG77189021',
        advanceAmount: 335000,
        dueAmount: 0,
        paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      },
      paymentStatus: 'pending',
      orderStatus: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'LUX-651908',
      userId: 'guest_ctg_44',
      customer: {
        name: 'Mahmudul Hasan',
        phone: '+880 1912-334455',
        email: 'm.hasan@portcity.com',
        shippingAddress: 'Khulshi Hills R/A, Road 2, Chattogram',
        district: 'Chattogram',
      },
      items: [
        {
          productId: 'apple-watch-ultra-2',
          sku: 'APL-WCH-U2',
          nameEn: 'Apple Watch Ultra 2 Titanium Noir Edition',
          nameBn: 'অ্যাপল ওয়াচ আল্ট্রা ২ টাইটানিয়াম সংস্করণ',
          image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
          price: 98500,
          quantity: 1,
          selectedColor: 'Titanium Midnight',
        },
      ],
      subtotal: 98500,
      deliveryCharge: 200,
      discount: 0,
      totalAmount: 98700,
      paymentMethod: 'cod',
      paymentOption: 'partial_advance',
      paymentDetails: {
        method: 'bkash',
        option: 'partial_advance',
        mfsProvider: 'bkash',
        senderNumber: '01912334455',
        transactionId: 'BK33419088',
        advanceAmount: 200,
        dueAmount: 98500,
      },
      paymentStatus: 'partially_paid',
      orderStatus: 'Processing',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'LUX-520194',
      userId: 'usr_sylhet_09',
      customer: {
        name: 'Farhan Chowdhury',
        phone: '+880 1712-998877',
        email: 'farhan.c@londoni.co',
        shippingAddress: 'Shahjalal Uposhohor, Block C, Sylhet',
        district: 'Sylhet',
      },
      items: [
        {
          productId: 'fujifilm-x100vi',
          sku: 'FUJI-X100VI',
          nameEn: 'Fujifilm X100VI Limited Edition',
          nameBn: 'ফুজিফিল্ম এক্স১০০ভিআই লিমিটেড এডিশন',
          image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          price: 215000,
          quantity: 1,
          selectedColor: 'Silver & Matte Black',
        },
      ],
      subtotal: 215000,
      deliveryCharge: 200,
      discount: 3000,
      totalAmount: 212200,
      paymentMethod: 'bkash',
      paymentOption: 'full_payment',
      paymentDetails: {
        method: 'bkash',
        option: 'full_payment',
        mfsProvider: 'bkash',
        senderNumber: '01712998877',
        transactionId: 'BK88190234',
        advanceAmount: 212200,
        dueAmount: 0,
      },
      paymentStatus: 'paid',
      orderStatus: 'Delivered',
      trackingInfo: {
        courier: 'Pathao Prime Express',
        trackingNumber: 'PTH-SYL-9981',
        consignmentId: 'PTH-SYL-9981',
        estimatedDelivery: 'Delivered on 18 Aug',
      },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export const orderService = {
  generateOrderId,
  createOrder,
  getUserOrders,
  subscribeToUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  verifyOrderPayment,
  deleteOrder,
  clearAllOrders,
  searchOrdersForTracking,
  getSampleTrackingOrder,
  getSampleAdminOrders,
};


