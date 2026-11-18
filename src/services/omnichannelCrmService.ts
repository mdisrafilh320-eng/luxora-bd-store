/**
 * Luxora BD - Strictly Admin-Only Omnichannel AI Sales CRM Service
 * Centralizes Facebook Messenger, WhatsApp Business, Instagram, TikTok & Website Live Chat threads
 * in Firestore under strict Admin RBAC isolation (`crm_conversations`, `omnichannel_channels`, `settings`).
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AiTrainingConfig,
  ChannelConnectionConfig,
  ConversationAiMode,
  CourierTracking,
  CrmConversation,
  CrmEntryType,
  CrmMessage,
  DeliveryQuoteInfo,
  EscalationTicket,
  ExternalCatalogItem,
  ExtractedOrderDraft,
  Language,
  LogisticsAndSheetsConfig,
  Order,
  PendingAiDraft,
  Product,
  SalesCopilotResult,
  SocialChannel,
} from '../types';

const CRM_COLLECTION = 'crm_conversations';
const CHANNELS_COLLECTION = 'omnichannel_channels';
const SETTINGS_COLLECTION = 'settings';
const AI_TRAINING_DOC = 'ai_training';
const LOGISTICS_SHEETS_DOC = 'logistics_sheets';

export const DEFAULT_CHANNEL_CONFIGS: ChannelConnectionConfig[] = [
  {
    id: 'messenger',
    label: 'Facebook Messenger',
    handleOrNumber: 'm.me/luxorabd.official',
    pageOrBusinessId: '',
    wabaId: '',
    instagramBusinessId: '',
    accessToken: '',
    appKey: '',
    appSecret: '',
    verifyToken: 'luxora-omnichannel-verify',
    connected: true,
    autoAiDraft: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp Business',
    handleOrNumber: '+880 1871-693050',
    pageOrBusinessId: '',
    wabaId: '',
    instagramBusinessId: '',
    accessToken: '',
    appKey: '',
    appSecret: '',
    verifyToken: 'luxora-omnichannel-verify',
    connected: true,
    autoAiDraft: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'instagram',
    label: 'Instagram Direct',
    handleOrNumber: '@luxorabd.luxury',
    pageOrBusinessId: '',
    wabaId: '',
    instagramBusinessId: '',
    accessToken: '',
    appKey: '',
    appSecret: '',
    verifyToken: 'luxora-omnichannel-verify',
    connected: true,
    autoAiDraft: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tiktok',
    label: 'TikTok Business DM',
    handleOrNumber: '@luxorabd',
    pageOrBusinessId: '',
    wabaId: '',
    instagramBusinessId: '',
    accessToken: '',
    appKey: '',
    appSecret: '',
    verifyToken: 'luxora-omnichannel-verify',
    connected: true,
    autoAiDraft: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'web',
    label: 'Website Live Chat',
    handleOrNumber: 'luxorabd.com AI Concierge',
    pageOrBusinessId: 'web-widget',
    wabaId: '',
    instagramBusinessId: '',
    accessToken: '',
    appKey: '',
    appSecret: '',
    verifyToken: 'luxora-omnichannel-verify',
    connected: true,
    autoAiDraft: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_AI_TRAINING_CONFIG: AiTrainingConfig = {
  storePersona:
    'Polite, helpful, luxury Bangladeshi retail sales closer fluent in Bengali, English, and Banglish ("Vai/Apu, koto dam?").',
  businessRules:
    'Always quote exact catalog BDT pricing, emphasize 100% authentic factory-sealed stock, mention 7-day replacement warranty, and confirm Name, Phone Number, District, and Street Address to finalize orders.',
  deliveryPolicyText:
    'Dhaka Metro ৳70 (24h), Chattogram City ৳100 (24-48h), Nationwide 64 Districts ৳120 (48-72h). Free Delivery on orders ≥ ৳5,000 BDT.',
  fixedPricePolicy:
    'Luxora BD operates on transparent fixed pricing; politely defend quality & warranty instead of discounting.',
  defaultAiMode: 'auto_pilot',
  autoDetectBanglish: true,
  autoCreateOrderFromChat: true,
  autoEscalateComplaints: true,
  faqs: [
    {
      id: 'faq-1',
      question: 'ক্যাশ অন ডেলিভারিতে কি নেওয়া যাবে?',
      answer: 'জি! সারা বাংলাদেশের ৬৪ জেলায় ১০০% ক্যাশ অন ডেলিভারি সুবিধা রয়েছে (পণ্য দেখে পেমেন্ট)।',
    },
    {
      id: 'faq-2',
      question: 'প্রোডাক্ট কি অরিজিনাল এবং ওয়ারেন্টি আছে?',
      answer: '১০০% অরিজিনাল সিল্ড প্যাক প্রোডাক্ট। প্রতিটি গ্যাজেটে ৭ দিনের রিপ্লেসমেন্ট ও অফিশিয়াল ব্র্যান্ড ওয়ারেন্টি রয়েছে।',
    },
  ],
  externalCatalog: [],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_LOGISTICS_CONFIG: LogisticsAndSheetsConfig = {
  steadfastApiKey: '',
  steadfastSecretKey: '',
  pathaoClientId: '',
  pathaoClientSecret: '',
  pathaoStoreId: '',
  pathaoAccessToken: '',
  googleSheetsWebhookUrl: '',
  googleSheetName: 'Luxora_BD_Orders',
  autoPushOrdersToSheets: false,
  shopifyStoreUrl: '',
  shopifyWebhookSecret: '',
  wooCommerceStoreUrl: '',
  wooCommerceConsumerKey: '',
  updatedAt: new Date().toISOString(),
};

function stripUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return val;
}

/**
 * Compute official Luxora BD nationwide delivery quote
 */
export function calculateDeliveryCharge(
  district: string,
  subtotal: number,
  freeDeliveryFlag = false
): DeliveryQuoteInfo {
  const cleanDistrict = (district || 'Dhaka').trim() || 'Dhaka';
  if (freeDeliveryFlag) {
    return { district: cleanDistrict, charge: 0, freeReason: 'Free delivery item' };
  }
  if (subtotal >= 5000) {
    return { district: cleanDistrict, charge: 0, freeReason: 'Free shipping (Order ≥ ৳5,000)' };
  }
  const d = cleanDistrict.toLowerCase();
  if (d.includes('dhaka') || d.includes('ঢাকা')) {
    return { district: 'Dhaka', charge: 70 };
  }
  if (d.includes('chattogram') || d.includes('chittagong') || d.includes('চট্টগ্রাম')) {
    return { district: 'Chattogram', charge: 100 };
  }
  return { district: cleanDistrict, charge: 120 };
}

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');
  if (s.length < 2) return s ? [s] : [];
  const res: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    res.push(s.slice(i, i + 2));
  }
  return res;
}

function diceSimilarity(a: string, b: string): number {
  const bgA = getBigrams(a);
  const bgB = getBigrams(b);
  if (!bgA.length || !bgB.length) return 0;
  const setB = new Map<string, number>();
  for (const bg of bgB) setB.set(bg, (setB.get(bg) || 0) + 1);
  let overlap = 0;
  for (const bg of bgA) {
    const c = setB.get(bg) || 0;
    if (c > 0) {
      overlap++;
      setB.set(bg, c - 1);
    }
  }
  return (2 * overlap) / (bgA.length + bgB.length);
}

/**
 * Client-side Fuzzy & Partial Name Catalog Matcher (e.g. "b72" -> B72-B Earbuds, "calender" -> 3D Calendar Lamp)
 */
export function fuzzyMatchProductsClient(queryText: string, catalog: Product[], limit = 6): Product[] {
  const raw = String(queryText || '').trim().toLowerCase();
  if (!raw || !Array.isArray(catalog) || catalog.length === 0) return [];

  const stopWords = new Set([
    'price', 'koto', 'dam', 'available', 'ase', 'ache', 'naki', 'bhai', 'vai', 'vaiya',
    'sir', 'apni', 'apnara', 'hello', 'hi', 'assalamu', 'alaikum', 'need', 'want',
    'details', 'pic', 'photo', 'image', 'discount', 'kom', 'kora', 'jabe', 'fixed',
    'order', 'korbo', 'chai', 'please', 'pls', 'the', 'this', 'that', 'for', 'with',
    'দাম', 'কত', 'আছে', 'নাকি', 'ভাই', 'অর্ডার', 'করব', 'চাই', 'কম', 'হবে', 'ছবি',
  ]);

  const tokens = raw
    .split(/[\s,.;:!?/\\|()\[\]{}"']+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  const normQuery = raw.replace(/[^a-z0-9]/g, '');

  const scored = catalog.map((prod) => {
    const searchable = `${prod.nameEn} ${prod.nameBn} ${prod.brand} ${prod.category} ${prod.taglineEn || ''} ${prod.sku || ''} ${prod.id}`.toLowerCase();
    const normSearchable = searchable.replace(/[^a-z0-9]/g, '');
    const words = `${prod.nameEn} ${prod.brand} ${prod.category} ${prod.sku || ''}`
      .toLowerCase()
      .split(/[\s\-_/]+/)
      .filter((w) => w.length >= 2);

    let score = 0;

    if (normQuery.length >= 2 && normSearchable.includes(normQuery)) {
      score += 45;
    }

    for (const token of tokens) {
      const tokenNorm = token.replace(/[^a-z0-9]/g, '');
      if (searchable.includes(token)) {
        score += token.length >= 4 ? 26 : 18;
      } else if (tokenNorm.length >= 2 && normSearchable.includes(tokenNorm)) {
        score += 24;
      } else {
        let best = 0;
        for (const w of words) {
          const sim = diceSimilarity(token, w);
          if (sim > best) best = sim;
        }
        if (best >= 0.6) {
          score += Math.round(best * 22);
        }
      }
    }

    if (score > 0 && prod.inStock && (prod.stockCount ?? 1) > 0) {
      score += 3;
    }
    return { prod, score };
  });

  return scored
    .filter((x) => x.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.prod);
}

/**
 * Subscribe to real-time CRM conversations (Admin Only)
 */
export function subscribeToCrmConversations(
  onUpdate: (conversations: CrmConversation[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, CRM_COLLECTION), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CrmConversation[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as CrmConversation;
        items.push({
          ...data,
          id: data.id || d.id,
          messages: Array.isArray(data.messages) ? data.messages : [],
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('CRM conversations subscription notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to omnichannel channel connection configurations (Admin Only)
 */
export function subscribeToChannelConfigs(
  onUpdate: (configs: ChannelConnectionConfig[]) => void
): () => void {
  return onSnapshot(
    collection(db, CHANNELS_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_CHANNEL_CONFIGS);
        return;
      }
      const map = new Map<SocialChannel, ChannelConnectionConfig>();
      for (const def of DEFAULT_CHANNEL_CONFIGS) {
        map.set(def.id, def);
      }
      snapshot.forEach((d) => {
        const data = d.data() as ChannelConnectionConfig;
        if (data && data.id) {
          map.set(data.id, data);
        }
      });
      onUpdate(Array.from(map.values()));
    },
    () => {
      onUpdate(DEFAULT_CHANNEL_CONFIGS);
    }
  );
}

export async function saveChannelConfig(config: ChannelConnectionConfig): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const payload: ChannelConnectionConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, CHANNELS_COLLECTION, config.id), stripUndefinedDeep(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${CHANNELS_COLLECTION}/${config.id}`);
  }
}

export function subscribeToAiTrainingConfig(
  onUpdate: (config: AiTrainingConfig) => void
): () => void {
  return onSnapshot(
    doc(db, SETTINGS_COLLECTION, AI_TRAINING_DOC),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(DEFAULT_AI_TRAINING_CONFIG);
        return;
      }
      const data = snap.data() as Partial<AiTrainingConfig>;
      onUpdate({
        ...DEFAULT_AI_TRAINING_CONFIG,
        ...data,
        faqs: Array.isArray(data.faqs) ? data.faqs : DEFAULT_AI_TRAINING_CONFIG.faqs,
        externalCatalog: Array.isArray(data.externalCatalog) ? data.externalCatalog : [],
      });
    },
    () => {
      onUpdate(DEFAULT_AI_TRAINING_CONFIG);
    }
  );
}

export async function saveAiTrainingConfig(config: AiTrainingConfig): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const payload: AiTrainingConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser.email || auth.currentUser.uid,
  };
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, AI_TRAINING_DOC), stripUndefinedDeep(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${AI_TRAINING_DOC}`);
  }

  // Also push to live Express AI runtime cache
  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/omnichannel/ai-training', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ training: payload }),
    });
  } catch {
    // non-fatal
  }
}

export function subscribeToLogisticsConfig(
  onUpdate: (config: LogisticsAndSheetsConfig) => void
): () => void {
  return onSnapshot(
    doc(db, SETTINGS_COLLECTION, LOGISTICS_SHEETS_DOC),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(DEFAULT_LOGISTICS_CONFIG);
        return;
      }
      onUpdate({
        ...DEFAULT_LOGISTICS_CONFIG,
        ...(snap.data() as Partial<LogisticsAndSheetsConfig>),
      });
    },
    () => {
      onUpdate(DEFAULT_LOGISTICS_CONFIG);
    }
  );
}

export async function saveLogisticsConfig(config: LogisticsAndSheetsConfig): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const payload: LogisticsAndSheetsConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser.email || auth.currentUser.uid,
  };
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, LOGISTICS_SHEETS_DOC), stripUndefinedDeep(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SETTINGS_COLLECTION}/${LOGISTICS_SHEETS_DOC}`);
  }

  try {
    const idToken = await auth.currentUser.getIdToken();
    await fetch('/api/omnichannel/ai-training', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ logistics: payload }),
    });
  } catch {
    // non-fatal
  }
}

export async function syncExternalCatalog(
  source: 'csv' | 'facebook' | 'shopify' | 'woocommerce',
  payload: string
): Promise<{ importedCount: number; totalExternalCatalog: number; items: ExternalCatalogItem[] }> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin sign-in required.');
  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/catalog/sync-external', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ source, payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Failed external catalog sync (${res.status})`);
  }
  return json;
}

export async function bookCourierParcel(params: {
  orderId: string;
  provider: 'steadfast' | 'pathao';
  customer: Order['customer'];
  totalAmount: number;
  codAmount: number;
  note?: string;
}): Promise<{
  provider: 'steadfast' | 'pathao';
  liveBooked: boolean;
  trackingInfo: CourierTracking;
  message: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin sign-in required.');
  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/courier/book-parcel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Courier booking failed (${res.status})`);
  }
  return json;
}

export async function syncOrdersToGoogleSheets(
  orders: Order[],
  webhookUrl?: string
): Promise<{ pushedLive: boolean; rowCount: number; message: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin sign-in required.');
  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/integrations/google-sheets/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orders, webhookUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Google Sheets sync failed (${res.status})`);
  }
  return json;
}

export function downloadOrdersCsvForGoogleSheets(orders: Order[]): void {
  const headers = [
    'Order ID',
    'Date',
    'Source Channel',
    'Customer Name',
    'Phone',
    'District',
    'Shipping Address',
    'Items',
    'Subtotal (BDT)',
    'Delivery Fee (BDT)',
    'Total (BDT)',
    'Payment Method',
    'Payment Status',
    'TrxID',
    'Order Status',
    'Courier',
    'Consignment ID',
  ];

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines = [
    headers.map(esc).join(','),
    ...orders.map((o) =>
      [
        o.id,
        new Date(o.createdAt).toLocaleString(),
        o.sourceChannel || 'luxora_web',
        o.customer.name,
        o.customer.phone,
        o.customer.district,
        o.customer.shippingAddress,
        o.items.map((i) => `${i.nameEn} x${i.quantity}`).join(' | '),
        o.subtotal,
        o.deliveryCharge,
        o.totalAmount,
        o.paymentMethod,
        o.paymentStatus,
        o.paymentDetails?.transactionId || '',
        o.orderStatus,
        o.trackingInfo?.courier || '',
        o.trackingInfo?.consignmentId || o.trackingInfo?.trackingNumber || '',
      ]
        .map(esc)
        .join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LuxoraBD-Orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function syncChannelConfigsToServer(
  configs: ChannelConnectionConfig[],
  verifyToken?: string
): Promise<{
  syncedAt: string;
  verifyToken: string;
  readiness: Array<{ id: SocialChannel; connected: boolean; autoAiDraft: boolean; readyForLiveReply: boolean }>;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin sign-in required.');
  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/omnichannel/credentials/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ channels: configs, verifyToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Failed to sync credentials (${res.status})`);
  }
  return res.json();
}

export async function fetchServerChannelStatus(): Promise<{
  verifyToken: string;
  channels: Array<{
    id: SocialChannel;
    hasAccessToken: boolean;
    maskedAccessToken: string;
    lastWebhookAt: string | null;
    lastDispatchStatus: string | null;
  }>;
} | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/omnichannel/credentials', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function dispatchLiveChannelReply(params: {
  channel: SocialChannel;
  customerId: string;
  customerPhone?: string;
  text: string;
}): Promise<{
  dispatchedLive: boolean;
  status: string;
  detail: string;
  externalMessageId?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { dispatchedLive: false, status: 'unauthenticated', detail: 'Admin login required.' };
  }
  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/omnichannel/send-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      return { dispatchedLive: false, status: 'http_error', detail: `Status ${res.status}` };
    }
    return res.json();
  } catch (err: any) {
    return { dispatchedLive: false, status: 'network_error', detail: err?.message || 'Network error' };
  }
}

export async function transcribeVoiceNote(
  audioDataUri: string
): Promise<{ transcript: string; detectedLanguage: Language; provider: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin authentication required.');
  const idToken = await currentUser.getIdToken();
  const res = await fetch('/api/ai/transcribe-voice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ audioDataUri }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Voice transcription failed (${res.status})`);
  }
  return {
    transcript: String(json.transcript || ''),
    detectedLanguage: json.detectedLanguage === 'bn' ? 'bn' : 'en',
    provider: String(json.provider || 'gemini-3.5-transcribe'),
  };
}

export async function triggerWebhookPipelineTest(params: {
  channel: SocialChannel;
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  customerName: string;
  customerId?: string;
  text: string;
  imageDataUri?: string;
  audioDataUri?: string;
  catalog?: Product[];
}): Promise<{
  queueId: string;
  channel: SocialChannel;
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  text: string;
  aiAutoReply?: string;
  aiMatchedProductIds?: string[];
  aiVisualAnalysis?: string;
  aiUrgencyAngle?: string;
  aiVoiceTranscript?: string;
  aiDeliveryQuote?: DeliveryQuoteInfo;
  dispatchStatus?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Verified Admin authentication required.');
  const idToken = await currentUser.getIdToken();
  const compactCatalog = (params.catalog || []).slice(0, 60).map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    brand: p.brand,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    inStock: p.inStock,
    stockCount: p.stockCount,
    image: p.image,
    freeDelivery: p.freeDelivery,
  }));

  const res = await fetch('/api/omnichannel/test-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      channel: params.channel,
      entryType: params.entryType,
      postTitleOrId: params.postTitleOrId,
      customerName: params.customerName,
      customerId: params.customerId,
      text: params.text,
      imageDataUri: params.imageDataUri,
      audioDataUri: params.audioDataUri,
      clientCatalogFallback: compactCatalog,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.event) {
    throw new Error(json?.error || `Webhook test failed (${res.status})`);
  }
  return json.event;
}

export async function ensureDefaultChannelConfigs(): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const snap = await getDocs(collection(db, CHANNELS_COLLECTION));
    const existingIds = new Set<string>();
    snap.forEach((d) => existingIds.add(d.id));
    for (const cfg of DEFAULT_CHANNEL_CONFIGS) {
      if (!existingIds.has(cfg.id)) {
        await setDoc(doc(db, CHANNELS_COLLECTION, cfg.id), stripUndefinedDeep(cfg));
      }
    }
  } catch {
    // non-fatal
  }
}

export async function createInboundConversation(params: {
  channel: SocialChannel;
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  customerId?: string;
  customerName: string;
  customerHandle?: string;
  customerPhone?: string;
  customerEmail?: string;
  text: string;
  imageUrl?: string;
  audioDataUri?: string;
  audioTranscript?: string;
  matchedProductIds?: string[];
  detectedLanguage?: Language;
  visualAnalysis?: string;
  deliveryQuote?: DeliveryQuoteInfo;
  aiMode?: ConversationAiMode;
  escalation?: EscalationTicket;
  extractedOrderDraft?: ExtractedOrderDraft;
}): Promise<CrmConversation> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const now = new Date().toISOString();
  const id = `crm-${params.channel}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const msgId = `msg-${Date.now().toString(36)}`;
  const combinedText = params.audioTranscript
    ? `${params.text || ''} ${params.audioTranscript}`
    : params.text;
  const inferredLang: Language =
    params.detectedLanguage ||
    (/[\u0980-\u09FF]/.test(combinedText) ||
    /\b(vai|bhai|apu|koto|dam|ase|korbo|taka|lagbe|pathao)\b/i.test(combinedText)
      ? 'bn'
      : 'en');

  const resolvedEntryType: CrmEntryType =
    params.entryType ||
    (params.audioDataUri ? 'voice_note' : params.channel === 'web' ? 'web_chat' : 'dm');

  const firstMsg: CrmMessage = {
    id: msgId,
    sender: 'customer',
    entryType: resolvedEntryType,
    postTitleOrId: params.postTitleOrId,
    text:
      params.text.trim() ||
      (params.audioTranscript
        ? `Voice note: ${params.audioTranscript}`
        : params.imageUrl
          ? 'Sent a product screenshot'
          : ''),
    imageUrl: params.imageUrl,
    audioDataUri: params.audioDataUri,
    audioTranscript: params.audioTranscript,
    matchedProductIds: params.matchedProductIds,
    visualAnalysis: params.visualAnalysis,
    deliveryQuote: params.deliveryQuote,
    timestamp: now,
  };

  const conv: CrmConversation = {
    id,
    channel: params.channel,
    entryType: resolvedEntryType,
    postTitleOrId: params.postTitleOrId,
    customerId: params.customerId || params.customerPhone || params.customerHandle || id,
    customerName: params.customerName.trim() || 'Social Visitor',
    customerHandle: params.customerHandle?.trim() || undefined,
    customerPhone: params.customerPhone?.trim() || undefined,
    customerEmail: params.customerEmail?.trim() || undefined,
    lastMessage: firstMsg.text,
    lastMessageAt: now,
    unreadCount: 1,
    status: 'open',
    detectedLanguage: inferredLang,
    aiMode: params.aiMode || 'auto_pilot',
    escalation: params.escalation,
    extractedOrderDraft: params.extractedOrderDraft,
    matchedProductIds: params.matchedProductIds || [],
    messages: [firstMsg],
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, CRM_COLLECTION, id), stripUndefinedDeep(conv));
    return conv;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${CRM_COLLECTION}/${id}`);
  }
}

export async function appendMessageToConversation(
  conversation: CrmConversation,
  message: Omit<CrmMessage, 'id' | 'timestamp'>,
  extraUpdates?: Partial<
    Pick<
      CrmConversation,
      | 'status'
      | 'matchedProductIds'
      | 'detectedLanguage'
      | 'unreadCount'
      | 'aiMode'
      | 'pendingAiDraft'
      | 'escalation'
      | 'extractedOrderDraft'
    >
  >
): Promise<CrmConversation> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const now = new Date().toISOString();
  const newMsg: CrmMessage = {
    ...message,
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    timestamp: now,
  };
  const updatedMessages = [...(conversation.messages || []), newMsg];
  const mergedProductIds = Array.from(
    new Set([
      ...(conversation.matchedProductIds || []),
      ...(extraUpdates?.matchedProductIds || []),
      ...(message.matchedProductIds || []),
    ])
  );

  const updates: Partial<CrmConversation> = {
    messages: updatedMessages,
    lastMessage: newMsg.text,
    lastMessageAt: now,
    unreadCount:
      extraUpdates?.unreadCount !== undefined
        ? extraUpdates.unreadCount
        : message.sender === 'customer'
          ? (conversation.unreadCount || 0) + 1
          : 0,
    status:
      extraUpdates?.status ||
      (message.sender !== 'customer' && conversation.status === 'open'
        ? 'negotiating'
        : conversation.status),
    matchedProductIds: mergedProductIds,
    detectedLanguage: extraUpdates?.detectedLanguage || conversation.detectedLanguage,
    ...(extraUpdates?.aiMode ? { aiMode: extraUpdates.aiMode } : {}),
    ...(extraUpdates?.pendingAiDraft !== undefined
      ? { pendingAiDraft: extraUpdates.pendingAiDraft }
      : {}),
    ...(extraUpdates?.escalation ? { escalation: extraUpdates.escalation } : {}),
    ...(extraUpdates?.extractedOrderDraft
      ? { extractedOrderDraft: extraUpdates.extractedOrderDraft }
      : {}),
    updatedAt: now,
  };

  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversation.id), stripUndefinedDeep(updates));
    return { ...conversation, ...updates } as CrmConversation;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversation.id}`);
  }
}

export async function updateConversationStatus(
  conversationId: string,
  status: CrmConversation['status']
): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function updateConversationAiMode(
  conversationId: string,
  aiMode: ConversationAiMode
): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      aiMode,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function savePendingAiDraft(
  conversationId: string,
  draft: PendingAiDraft | null
): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      pendingAiDraft: draft ? stripUndefinedDeep(draft) : null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function escalateConversationTicket(
  conversationId: string,
  params: {
    priority: 'normal' | 'high' | 'urgent';
    assignedRole: 'supervisor' | 'staff';
    reason: string;
    escalatedBy?: string;
  }
): Promise<EscalationTicket> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const ticket: EscalationTicket = {
    isEscalated: true,
    ticketId: `TKT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    priority: params.priority,
    assignedRole: params.assignedRole,
    reason: params.reason.trim() || 'Customer complaint / refund escalation',
    escalatedAt: new Date().toISOString(),
    escalatedBy: params.escalatedBy || auth.currentUser.email || 'Admin Agent',
  };
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      escalation: stripUndefinedDeep(ticket),
      aiMode: 'human_takeover',
      updatedAt: new Date().toISOString(),
    });
    return ticket;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function resolveEscalationTicket(conversationId: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      escalation: {
        isEscalated: false,
        resolvedAt: new Date().toISOString(),
      },
      status: 'resolved',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function saveExtractedOrderDraft(
  conversationId: string,
  draft: ExtractedOrderDraft
): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      extractedOrderDraft: stripUndefinedDeep(draft),
      ...(draft.confirmedOrderId ? { status: 'converted' } : {}),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(db, CRM_COLLECTION, conversationId), {
      unreadCount: 0,
    });
  } catch {
    // non-fatal
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  try {
    await deleteDoc(doc(db, CRM_COLLECTION, conversationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${CRM_COLLECTION}/${conversationId}`);
  }
}

/**
 * Call Server-Side Admin-Gated Gemini Vision + Voice + Sales Closer Copilot
 */
export async function requestAiSalesCopilot(params: {
  customerMessage: string;
  conversationHistory?: CrmMessage[];
  imageDataUri?: string;
  imageUrl?: string;
  audioDataUri?: string;
  entryType?: CrmEntryType;
  postTitleOrId?: string;
  customerDistrict?: string;
  preferredLanguage?: 'auto' | Language;
  tacticOverride?: 'balanced' | 'fixed_price_urgency' | 'handle_objection' | 'close_order';
  catalog?: Product[];
}): Promise<SalesCopilotResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Verified Admin sign-in required to invoke AI Sales Copilot.');
  }

  const idToken = await currentUser.getIdToken();
  const compactCatalogFallback = (params.catalog || []).slice(0, 60).map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    taglineEn: p.taglineEn,
    brand: p.brand,
    category: p.category,
    price: p.price,
    originalPrice: p.originalPrice,
    inStock: p.inStock,
    stockCount: p.stockCount,
    image: p.image,
    freeDelivery: p.freeDelivery,
    warrantyEn: p.warrantyEn,
  }));

  const response = await fetch('/api/ai/sales-copilot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      customerMessage: params.customerMessage,
      conversationHistory: (params.conversationHistory || []).slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text,
      })),
      imageDataUri: params.imageDataUri,
      imageUrl: params.imageUrl,
      audioDataUri: params.audioDataUri,
      entryType: params.entryType,
      postTitleOrId: params.postTitleOrId,
      customerDistrict: params.customerDistrict,
      preferredLanguage: params.preferredLanguage || 'auto',
      tacticOverride: params.tacticOverride || 'balanced',
      clientCatalogFallback: compactCatalogFallback,
    }),
  });

  if (!response.ok) {
    let errMsg = `Sales Copilot error (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error) errMsg = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const payload = await response.json();
  const data = payload?.data;
  if (!data) {
    throw new Error('Invalid AI Sales Copilot response payload.');
  }

  const rawMatched: any[] = Array.isArray(data.matchedProducts) ? data.matchedProducts : [];
  const catalogById = new Map((params.catalog || []).map((p) => [p.id, p]));
  const matchedProducts: Product[] = rawMatched.map((mp) => catalogById.get(mp.id) || (mp as Product));

  return {
    salesReply: String(data.salesReply || '').trim(),
    salesReplyAlternate: String(data.salesReplyAlternate || '').trim(),
    detectedLanguage: data.detectedLanguage === 'bn' ? 'bn' : 'en',
    customerIntent: String(data.customerIntent || 'Sales Inquiry'),
    urgencyAngle: String(data.urgencyAngle || ''),
    visualAnalysis: data.visualAnalysis ? String(data.visualAnalysis) : undefined,
    voiceTranscript: data.voiceTranscript ? String(data.voiceTranscript) : undefined,
    deliveryQuote: data.deliveryQuote || undefined,
    requiresEscalation: Boolean(data.requiresEscalation),
    escalationReason: data.escalationReason ? String(data.escalationReason) : undefined,
    escalationPriority: data.escalationPriority || undefined,
    extractedOrder: data.extractedOrder || undefined,
    matchedProducts,
    provider: String(data.provider || 'gemini-4-hydrogen'),
  };
}

/**
 * Poll server webhook queue with Admin Firebase ID token and ingest messages into Firestore
 */
export async function syncPendingWebhookEvents(
  existingConversations: CrmConversation[],
  catalog: Product[]
): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser) return 0;

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/webhooks/omnichannel/pending', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return 0;
    const json = await res.json();
    const events: any[] = Array.isArray(json?.events) ? json.events : [];
    if (events.length === 0) return 0;

    let synced = 0;
    for (const ev of events) {
      const channel = (ev.channel || 'messenger') as SocialChannel;
      const customerId = String(ev.customerId || '').trim();
      const text = String(ev.text || '').trim();
      const entryType = (ev.entryType || (channel === 'web' ? 'web_chat' : 'dm')) as CrmEntryType;
      const fuzzyIds = fuzzyMatchProductsClient(
        `${text} ${ev.aiVoiceTranscript || ''}`,
        catalog,
        3
      ).map((p) => p.id);
      const mergedMatchedIds = Array.from(
        new Set([...(Array.isArray(ev.aiMatchedProductIds) ? ev.aiMatchedProductIds : []), ...fuzzyIds])
      );

      let conv = existingConversations.find(
        (c) => c.channel === channel && c.customerId === customerId
      );

      const autoEscalation: EscalationTicket | undefined = ev.requiresEscalation
        ? {
            isEscalated: true,
            ticketId: `TKT-${Date.now().toString(36).toUpperCase().slice(-6)}`,
            priority: 'high',
            assignedRole: 'supervisor',
            reason: ev.escalationReason || 'Complaint / Defect keyword detected automatically by AI',
            escalatedAt: new Date().toISOString(),
            escalatedBy: 'Luxora AI Auto-Triage',
          }
        : undefined;

      if (conv) {
        conv = await appendMessageToConversation(
          conv,
          {
            sender: 'customer',
            entryType,
            postTitleOrId: ev.postTitleOrId,
            text: text || (ev.aiVoiceTranscript ? `Voice note: ${ev.aiVoiceTranscript}` : 'Sent media'),
            imageUrl: ev.imageUrl,
            audioDataUri: ev.audioDataUri,
            audioTranscript: ev.aiVoiceTranscript,
            matchedProductIds: mergedMatchedIds,
            visualAnalysis: ev.aiVisualAnalysis,
            deliveryQuote: ev.aiDeliveryQuote,
          },
          {
            unreadCount: (conv.unreadCount || 0) + 1,
            matchedProductIds: mergedMatchedIds,
            ...(autoEscalation && !conv.escalation?.isEscalated ? { escalation: autoEscalation, aiMode: 'human_takeover' } : {}),
            ...(ev.aiExtractedOrder ? { extractedOrderDraft: ev.aiExtractedOrder } : {}),
          }
        );
      } else {
        conv = await createInboundConversation({
          channel,
          entryType,
          postTitleOrId: ev.postTitleOrId,
          customerId,
          customerName: String(ev.customerName || 'Social Customer'),
          customerHandle: ev.customerHandle,
          customerPhone: ev.customerPhone,
          text: text || (ev.aiVoiceTranscript ? `Voice note: ${ev.aiVoiceTranscript}` : 'Sent media'),
          imageUrl: ev.imageUrl,
          audioDataUri: ev.audioDataUri,
          audioTranscript: ev.aiVoiceTranscript,
          matchedProductIds: mergedMatchedIds,
          detectedLanguage: ev.aiDetectedLanguage,
          visualAnalysis: ev.aiVisualAnalysis,
          deliveryQuote: ev.aiDeliveryQuote,
          aiMode: autoEscalation
            ? 'human_takeover'
            : ev.dispatchStatus === 'pending_human_review'
              ? 'review_mode'
              : 'auto_pilot',
          escalation: autoEscalation,
          extractedOrderDraft: ev.aiExtractedOrder,
        });
      }

      // Handle Auto-Pilot vs Review Mode AI replies
      if (ev.aiAutoReply) {
        const isReview =
          ev.dispatchStatus === 'pending_human_review' || conv.aiMode === 'review_mode';
        if (isReview) {
          await savePendingAiDraft(conv.id, {
            text: String(ev.aiAutoReply),
            urgencyAngle: ev.aiUrgencyAngle,
            visualAnalysis: ev.aiVisualAnalysis,
            matchedProductIds: mergedMatchedIds,
            deliveryQuote: ev.aiDeliveryQuote,
            createdAt: new Date().toISOString(),
          });
        } else if (conv.aiMode !== 'human_takeover') {
          await appendMessageToConversation(
            conv,
            {
              sender: 'ai_assistant',
              entryType,
              text: String(ev.aiAutoReply),
              matchedProductIds: mergedMatchedIds,
              visualAnalysis: ev.aiVisualAnalysis,
              urgencyAngle: ev.aiUrgencyAngle,
              deliveryQuote: ev.aiDeliveryQuote,
              aiStatus: 'auto_sent',
            },
            {
              status: 'negotiating',
              matchedProductIds: mergedMatchedIds,
              unreadCount: ev.dispatchStatus?.startsWith('sent_live') ? 0 : 1,
            }
          );
        }
      }
      synced++;
    }
    return synced;
  } catch {
    return 0;
  }
}

/**
 * Compress uploaded customer screenshot Data URL to stay compact inside Firestore documents
 */
export async function compressChatImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxSide = 760;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert recorded/uploaded audio file to Data URI
 */
export async function readAudioFileAsDataUri(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read audio clip.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

/**
 * Seed realistic omnichannel DM, Post Comment, Web Chat & Voice inquiries using live store products
 */
export async function seedSampleOmnichannelConversations(catalog: Product[]): Promise<number> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');

  const earbudsProd =
    catalog.find((p) => /b72|earbud/i.test(p.nameEn)) || catalog[0];
  const lampProd =
    catalog.find((p) => /rose|diamond|lamp|calendar|sunset/i.test(p.nameEn)) || catalog[1] || catalog[0];
  const watchProd =
    catalog.find((p) => /watch|poedagar|binbond/i.test(p.nameEn)) || catalog[2] || catalog[0];

  const now = Date.now();
  const samples: Array<Omit<CrmConversation, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      channel: 'messenger',
      entryType: 'dm',
      customerId: 'fb-tanvir-9102',
      customerName: 'Tanvir Ahmed',
      customerHandle: 'fb.com/tanvir.dhaka',
      customerPhone: '01711234567',
      lastMessage: 'Vai b72 earbud er last fixed dam koto? Dhaka Mirpur e delivery koto?',
      lastMessageAt: new Date(now - 1000 * 60 * 5).toISOString(),
      unreadCount: 1,
      status: 'negotiating',
      detectedLanguage: 'bn',
      aiMode: 'review_mode',
      pendingAiDraft: {
        text: `আসসালামু আলাইকুম ভাই! ${earbudsProd?.nameEn || 'Earbuds'} এর ফিক্সড প্রাইস ৳${(earbudsProd?.price || 1950).toLocaleString()} (১০০% অরিজিনাল সিল্ড প্যাক + ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি)। ঢাকা মেট্রো ডেলিভারি চার্জ মাত্র ৳৭০ (২৪ ঘণ্টায় হোম ডেলিভারি)। অর্ডার কনফার্ম করতে চাইলে আপনার নাম, ফোন ও ঠিকানা দিন ভাই!`,
        intent: 'Fixed Price & Delivery Fee Inquiry',
        urgencyAngle: 'Limited authentic stock in Dhaka Hub',
        matchedProductIds: earbudsProd ? [earbudsProd.id] : [],
        deliveryQuote: { district: 'Dhaka', charge: 70 },
        createdAt: new Date(now - 1000 * 60 * 4).toISOString(),
      },
      matchedProductIds: earbudsProd ? [earbudsProd.id] : [],
      messages: [
        {
          id: 'm-seed-1a',
          sender: 'customer',
          entryType: 'dm',
          text: 'Vai b72 earbud er last fixed dam koto? Dhaka Mirpur e delivery koto?',
          matchedProductIds: earbudsProd ? [earbudsProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        },
      ],
    },
    {
      channel: 'instagram',
      entryType: 'comment',
      postTitleOrId: 'IG Reel: Luxury Watch Unboxing Showcase',
      customerId: 'ig-farhan_lux',
      customerName: 'Farhan Kabir',
      customerHandle: '@farhan_kabir_bd',
      lastMessage: `Price please? Is the ${watchProd?.nameEn || 'watch'} still available for Cash on Delivery?`,
      lastMessageAt: new Date(now - 1000 * 60 * 14).toISOString(),
      unreadCount: 1,
      status: 'open',
      detectedLanguage: 'en',
      aiMode: 'auto_pilot',
      matchedProductIds: watchProd ? [watchProd.id] : [],
      messages: [
        {
          id: 'm-seed-3a',
          sender: 'customer',
          entryType: 'comment',
          postTitleOrId: 'IG Reel: Luxury Watch Unboxing Showcase',
          text: `Price please? Is the ${watchProd?.nameEn || 'watch'} still available for Cash on Delivery?`,
          matchedProductIds: watchProd ? [watchProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 14).toISOString(),
        },
      ],
    },
    {
      channel: 'whatsapp',
      entryType: 'dm',
      customerId: 'wa-01715442810',
      customerName: 'Nusrat Jahan',
      customerPhone: '01715442810',
      lastMessage: 'Order confirm korun: 1pc lamp, Dhanmondi Road 8, Dhaka, 01715442810',
      lastMessageAt: new Date(now - 1000 * 60 * 22).toISOString(),
      unreadCount: 1,
      status: 'ready_to_order',
      detectedLanguage: 'bn',
      aiMode: 'auto_pilot',
      extractedOrderDraft: {
        hasOrderIntent: true,
        readyToConfirm: true,
        productId: lampProd?.id,
        productName: lampProd?.nameEn || 'Luxury Night Lamp',
        quantity: 1,
        customerName: 'Nusrat Jahan',
        customerPhone: '01715442810',
        district: 'Dhaka',
        address: 'Dhanmondi Road 8, Dhaka',
        unitPrice: lampProd?.price || 1850,
        deliveryCharge: (lampProd?.price || 1850) >= 5000 ? 0 : 70,
        totalAmount: (lampProd?.price || 1850) + ((lampProd?.price || 1850) >= 5000 ? 0 : 70),
        confidence: 0.94,
      },
      matchedProductIds: lampProd ? [lampProd.id] : [],
      messages: [
        {
          id: 'm-seed-2a',
          sender: 'customer',
          entryType: 'dm',
          text: 'এই ল্যাম্পটার ছবি পাঠালাম, অরিজিনাল হবে তো? ক্যাশ অন ডেলিভারিতে নেওয়া যাবে?',
          imageUrl: lampProd?.image || undefined,
          matchedProductIds: lampProd ? [lampProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 24).toISOString(),
        },
        {
          id: 'm-seed-2b',
          sender: 'customer',
          entryType: 'dm',
          text: 'Order confirm korun: 1pc lamp, Dhanmondi Road 8, Dhaka, 01715442810',
          matchedProductIds: lampProd ? [lampProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        },
      ],
    },
    {
      channel: 'web',
      entryType: 'web_chat',
      customerId: 'web-visitor-401',
      customerName: 'Rafiqul Islam (Web Live Chat)',
      customerPhone: '01819223344',
      lastMessage: 'Hello, Sylhet e parcel delivery koto lagbe and parcel koto dine pabo?',
      lastMessageAt: new Date(now - 1000 * 60 * 35).toISOString(),
      unreadCount: 1,
      status: 'open',
      detectedLanguage: 'bn',
      aiMode: 'auto_pilot',
      matchedProductIds: watchProd ? [watchProd.id] : [],
      messages: [
        {
          id: 'm-seed-5a',
          sender: 'customer',
          entryType: 'web_chat',
          text: 'Hello, Sylhet e parcel delivery koto lagbe and parcel koto dine pabo?',
          timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        },
      ],
    },
    {
      channel: 'tiktok',
      entryType: 'comment',
      postTitleOrId: 'TikTok Post: 3D Calendar Lamp Promo',
      customerId: 'tt-sadia.reels',
      customerName: 'Sadia Afrin',
      customerHandle: '@sadia_reels99',
      lastMessage: 'calender night lamp ta ase? sylhet e pathaben kivabe',
      lastMessageAt: new Date(now - 1000 * 60 * 65).toISOString(),
      unreadCount: 0,
      status: 'negotiating',
      detectedLanguage: 'bn',
      aiMode: 'auto_pilot',
      matchedProductIds: lampProd ? [lampProd.id] : [],
      messages: [
        {
          id: 'm-seed-4a',
          sender: 'customer',
          entryType: 'comment',
          postTitleOrId: 'TikTok Post: 3D Calendar Lamp Promo',
          text: 'calender night lamp ta ase? sylhet e pathaben kivabe',
          matchedProductIds: lampProd ? [lampProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 65).toISOString(),
        },
      ],
    },
  ];

  let createdCount = 0;
  for (let i = 0; i < samples.length; i++) {
    const item = samples[i];
    const id = `crm-seed-${Date.now().toString(36)}-${i}`;
    const docData: CrmConversation = {
      ...item,
      id,
      createdAt: item.lastMessageAt,
      updatedAt: item.lastMessageAt,
    };
    await setDoc(doc(db, CRM_COLLECTION, id), stripUndefinedDeep(docData));
    createdCount++;
  }
  return createdCount;
}
