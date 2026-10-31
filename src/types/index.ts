export type Language = 'en' | 'bn';

export type ProductCategory = 
  | 'all'
  | 'audio'
  | 'wearables'
  | 'desk-charging'
  | 'apple-ecosystem'
  | 'photography'
  | 'lifestyle';

export interface ProductSpec {
  labelEn: string;
  labelBn: string;
  valueEn: string;
  valueBn: string;
}

export interface Product {
  id: string;
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  taglineBn: string;
  brand: string;
  category: ProductCategory;
  price: number; // In BDT (৳)
  originalPrice?: number;
  rating: number; // e.g. 4.9
  reviewsCount: number;
  inStock: boolean;
  stockCount: number;
  image: string;
  gallery: string[];
  descriptionEn: string;
  descriptionBn: string;
  specs: ProductSpec[];
  warrantyEn: string;
  warrantyBn: string;
  returnPolicyEn?: string;
  returnPolicyBn?: string;
  badge?: 'bestseller' | 'new' | 'limited' | 'sale';
  isFeatured?: boolean;
  colors?: { name: string; hex: string }[];
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
}

export interface UserAddress {
  id: string;
  title: string; // e.g. "Home", "Office"
  recipientName: string;
  phoneNumber: string;
  addressLine: string;
  district: string; // Bangladeshi District (e.g. Dhaka, Chittagong, Sylhet)
  isDefault: boolean;
}

export type UserRole = 'customer' | 'admin';
export type AdminRole = 'super_admin' | 'admin' | 'staff';
export type MembershipTier = 'Standard' | 'Gold' | 'Platinum' | 'VIP Noir';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  adminRole?: AdminRole;
  membershipTier: MembershipTier;
  language: Language;
  points: number;
  savedAddresses?: UserAddress[];
  isGuest?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'card';
export type PaymentOption = 'full_payment' | 'partial_advance' | 'cod';
export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'failed';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Processing' | 'In Transit' | 'Shipped' | 'Delivered' | 'Cancelled';

export type MfsAccountType = 'personal' | 'agent' | 'merchant';

export interface MfsGatewayConfig {
  id: 'bkash' | 'nagad' | 'rocket';
  nameEn: string;
  nameBn: string;
  accountNumber: string;
  accountType: MfsAccountType;
  isActive: boolean;
  ussdCode: string;
  themeColor: string;
  accentBg: string;
  iconText: string;
  instructionsEn?: string[];
  instructionsBn?: string[];
  trxIdFormatHint?: string;
  sendMoneyOnly: boolean;
  notesEn?: string;
  notesBn?: string;
  updatedAt?: string;
}

export interface PaymentSettings {
  gateways: Record<'bkash' | 'nagad' | 'rocket', MfsGatewayConfig>;
  sendMoneyStrictRule: boolean;
  partialAdvanceAmount: number;
  allowFullPayment: boolean;
  allowPartialAdvance: boolean;
  allowCod: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface PaymentDetails {
  method: PaymentMethod;
  option: PaymentOption;
  mfsProvider?: 'bkash' | 'nagad' | 'rocket';
  advanceAmount?: number;
  dueAmount?: number;
  senderNumber?: string;
  transactionId?: string;
  paymentProofUrl?: string;
  paymentProofName?: string;
  paymentTimestamp?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameBn: string;
  image: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  sku?: string;
}

export interface CourierTracking {
  courier: string; // e.g. "Steadfast Luxury Express", "Pathao Prime", "Paperfly"
  trackingNumber?: string;
  trackingCode?: string;
  consignmentId?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  lastLocation?: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
  division?: string;
  district: string;
  shippingAddress: string;
  notes?: string;
}

export interface Order {
  id: string; // e.g. "LUX-849201"
  userId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  promoCode?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentOption?: PaymentOption;
  paymentDetails?: PaymentDetails;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  trackingInfo?: CourierTracking;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  slug: ProductCategory;
  nameEn: string;
  nameBn: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  titleEn: string;
  titleBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
}
