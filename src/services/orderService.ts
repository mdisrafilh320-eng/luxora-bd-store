import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, OrderStatus, CourierTracking } from '../types';

const ORDERS_COLLECTION = 'orders';

/**
 * Generate luxury Order ID (e.g. LUX-839201)
 */
export function generateOrderId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `LUX-${randomNum}`;
}

/**
 * Create a new customer order in Firestore
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

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    orderStatus: 'Pending',
    paymentStatus: initialPaymentStatus,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const orderDocRef = doc(db, ORDERS_COLLECTION, orderId);
    await setDoc(orderDocRef, newOrder);
    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Fetch all orders placed by a specific user
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const q = query(
      colRef, 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const orders: Order[] = [];
    snap.forEach((docSnap) => {
      orders.push(docSnap.data() as Order);
    });
    return orders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${ORDERS_COLLECTION}?userId=${userId}`);
  }
}

/**
 * Retrieve a single order by ID
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
 * Search orders by Order ID or Phone number for guest and customer tracking
 */
export async function searchOrdersForTracking(searchQuery: string): Promise<Order | null> {
  const cleanQuery = searchQuery.trim();
  if (!cleanQuery) return null;

  try {
    // 1. If it looks like an Order ID (starts with LUX or contains uppercase numbers)
    const upperId = cleanQuery.toUpperCase();
    if (upperId.startsWith('LUX-') || upperId.length >= 6) {
      const order = await getOrderById(upperId);
      if (order) return order;
    }

    // 2. If it is a phone number, query by customer.phone
    const colRef = collection(db, ORDERS_COLLECTION);
    const phoneQuery = query(
      colRef,
      where('customer.phone', '==', cleanQuery),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(phoneQuery);
    if (!snap.empty) {
      return snap.docs[0].data() as Order;
    }

    // 3. Check for formatted phone number variation (e.g. +880 vs 017...)
    const cleanDigits = cleanQuery.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      const allOrdersSnap = await getDocs(query(colRef, orderBy('createdAt', 'desc')));
      for (const docSnap of allOrdersSnap.docs) {
        const data = docSnap.data() as Order;
        const custPhoneDigits = (data.customer?.phone || '').replace(/[^0-9]/g, '');
        if (custPhoneDigits.includes(cleanDigits) || cleanDigits.includes(custPhoneDigits)) {
          return data;
        }
      }
    }
  } catch (err) {
    console.warn('Firestore search order error:', err);
  }

  return null;
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
 * Fetch all orders for Enterprise ERP Admin Hub
 */
export async function getAllOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, ORDERS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return [];
    }
    
    const orders: Order[] = [];
    snap.forEach((docSnap) => {
      orders.push(docSnap.data() as Order);
    });
    return orders;
  } catch (error) {
    console.warn('Orders catalog empty or falling back to empty array:', error);
    return [];
  }
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


