export type Language = 'en' | 'bn';

export type ProductCategory = string;

export interface HeroBannerItem {
  id: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  ctaTextEn?: string;
  ctaTextBn?: string;
  targetCategory?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReturnPolicyConfig {
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  stepsEn: string[];
  stepsBn: string[];
  eligibilityNotesEn?: string;
  eligibilityNotesBn?: string;
  updatedAt?: string;
  updatedBy?: string;
}

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
  freeDelivery?: boolean;
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
  sizes?: string[];
  variants?: string[];
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
  email?: string;
  division?: string;
  divisionName?: string;
  district: string; // Bangladeshi District ID or name
  districtName?: string;
  upazila?: string;
  addressLine: string;
  isDefault: boolean;
}

export interface SavedDeliveryInfo {
  fullName: string;
  phoneNumber: string;
  email?: string;
  division: string;
  divisionName: string;
  district: string;
  districtName: string;
  upazila: string;
  detailedAddress: string;
  updatedAt: string;
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
  defaultDeliveryInfo?: SavedDeliveryInfo;
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
  deliveryCharge?: number;
  flatDeliveryCharge: number;
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
  bookedAt?: string;
  bookingStatus?: 'live_api' | 'sandbox_booked' | 'manual';
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email?: string;
  division?: string;
  district: string;
  upazila?: string;
  shippingAddress: string;
  notes?: string;
}

export type OrderSourceChannel =
  | 'luxora_web'
  | 'web'
  | 'messenger'
  | 'whatsapp'
  | 'instagram'
  | 'tiktok'
  | 'shopify'
  | 'woocommerce';

export interface Order {
  id: string; // e.g. "LUX-849201"
  userId: string;
  sourceChannel?: OrderSourceChannel;
  externalOrderId?: string;
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

export type SocialChannel = 'messenger' | 'whatsapp' | 'instagram' | 'tiktok' | 'web';

export type CrmEntryType = 'dm' | 'comment' | 'voice_note' | 'web_chat' | 'system_event';

export type ConversationAiMode = 'auto_pilot' | 'review_mode' | 'human_takeover';

export interface DeliveryQuoteInfo {
  district: string;
  charge: number;
  freeReason?: string;
}

export interface EscalationTicket {
  isEscalated: boolean;
  ticketId?: string;
  priority?: 'normal' | 'high' | 'urgent';
  assignedRole?: 'supervisor' | 'staff';
  reason?: string;
  escalatedAt?: string;
  escalatedBy?: string;
  resolvedAt?: string;
}

export interface ExtractedOrderDraft {
  hasOrderIntent?: boolean;
  readyToConfirm?: boolean;
  productId?: string;
  productName?: string;
  quantity: number;
  customerName?: string;
  customerPhone?: string;
  district?: string;
  address?: string;
  unitPrice: number;
  deliveryCharge: number;
  totalAmount: number;
  confidence: number;
  confirmedOrderId?: string;
}

export interface PendingAiDraft {
  text: string;
  alternateText?: string;
  intent?: string;
  urgencyAngle?: string;
  visualAnalysis?: string;
  matchedProductIds?: string[];
  deliveryQuote?: DeliveryQuoteInfo;
  createdAt: string;
}

export interface ChannelConnectionConfig {
  id: SocialChannel;
  label: string;
  handleOrNumber: string;
  pageOrBusinessId?: string;
  wabaId?: string;
  instagramBusinessId?: string;
  accessToken?: string;
  appKey?: string;
  appSecret?: string;
  verifyToken?: string;
  connected: boolean;
  autoAiDraft: boolean;
  lastWebhookAt?: string;
  lastDispatchStatus?: string;
  updatedAt: string;
}

export interface CrmMessage {
  id: string;
  sender: 'customer' | 'admin' | 'ai_assistant';
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  text: string;
  imageUrl?: string;
  audioDataUri?: string;
  audioTranscript?: string;
  matchedProductIds?: string[];
  visualAnalysis?: string;
  urgencyAngle?: string;
  deliveryQuote?: DeliveryQuoteInfo;
  aiStatus?: 'auto_sent' | 'pending_review' | 'approved' | 'rejected';
  timestamp: string;
}

export interface CrmConversation {
  id: string;
  channel: SocialChannel;
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  customerId: string;
  customerName: string;
  customerHandle?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'open' | 'negotiating' | 'ready_to_order' | 'converted' | 'resolved';
  detectedLanguage?: Language;
  aiMode?: ConversationAiMode;
  pendingAiDraft?: PendingAiDraft;
  escalation?: EscalationTicket;
  extractedOrderDraft?: ExtractedOrderDraft;
  matchedProductIds?: string[];
  messages: CrmMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesCopilotResult {
  salesReply: string;
  salesReplyAlternate?: string;
  detectedLanguage: Language;
  customerIntent: string;
  urgencyAngle: string;
  visualAnalysis?: string;
  voiceTranscript?: string;
  deliveryQuote?: DeliveryQuoteInfo;
  requiresEscalation?: boolean;
  escalationReason?: string;
  escalationPriority?: 'normal' | 'high' | 'urgent';
  extractedOrder?: ExtractedOrderDraft;
  matchedProducts: Product[];
  provider: string;
}

export interface AiTrainingFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ExternalCatalogItem {
  id: string;
  nameEn: string;
  nameBn?: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  inStock: boolean;
  image?: string;
  sku?: string;
  freeDelivery?: boolean;
  source: 'csv' | 'facebook' | 'shopify' | 'woocommerce';
  updatedAt: string;
}

export interface AiTrainingConfig {
  storePersona: string;
  businessRules: string;
  deliveryPolicyText: string;
  fixedPricePolicy: string;
  defaultAiMode: ConversationAiMode;
  autoDetectBanglish: boolean;
  autoCreateOrderFromChat: boolean;
  autoEscalateComplaints: boolean;
  faqs: AiTrainingFaq[];
  externalCatalog: ExternalCatalogItem[];
  lastCatalogSyncAt?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface LogisticsAndSheetsConfig {
  steadfastApiKey: string;
  steadfastSecretKey: string;
  pathaoClientId: string;
  pathaoClientSecret: string;
  pathaoStoreId: string;
  pathaoAccessToken: string;
  googleSheetsWebhookUrl: string;
  googleSheetName: string;
  autoPushOrdersToSheets: boolean;
  shopifyStoreUrl: string;
  shopifyWebhookSecret: string;
  wooCommerceStoreUrl: string;
  wooCommerceConsumerKey: string;
  updatedAt: string;
  updatedBy?: string;
}


