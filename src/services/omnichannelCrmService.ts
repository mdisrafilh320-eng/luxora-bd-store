/**
 * Luxora BD - Strictly Admin-Only Omnichannel AI Sales CRM Service
 * Centralizes Facebook Messenger, WhatsApp Business, Instagram & TikTok DM threads
 * in Firestore under strict Admin RBAC isolation (`crm_conversations`, `omnichannel_channels`).
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
  ChannelConnectionConfig,
  CrmConversation,
  CrmMessage,
  Language,
  Product,
  SalesCopilotResult,
  SocialChannel,
} from '../types';

const CRM_COLLECTION = 'crm_conversations';
const CHANNELS_COLLECTION = 'omnichannel_channels';

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
];

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

export async function triggerWebhookPipelineTest(params: {
  channel: SocialChannel;
  customerName: string;
  customerId?: string;
  text: string;
  imageDataUri?: string;
  catalog?: Product[];
}): Promise<{
  queueId: string;
  channel: SocialChannel;
  text: string;
  aiAutoReply?: string;
  aiMatchedProductIds?: string[];
  aiVisualAnalysis?: string;
  aiUrgencyAngle?: string;
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
  }));

  const res = await fetch('/api/omnichannel/test-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      channel: params.channel,
      customerName: params.customerName,
      customerId: params.customerId,
      text: params.text,
      imageDataUri: params.imageDataUri,
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
    if (snap.empty) {
      for (const cfg of DEFAULT_CHANNEL_CONFIGS) {
        await setDoc(doc(db, CHANNELS_COLLECTION, cfg.id), stripUndefinedDeep(cfg));
      }
    }
  } catch {
    // non-fatal
  }
}

export async function createInboundConversation(params: {
  channel: SocialChannel;
  customerName: string;
  customerHandle?: string;
  customerPhone?: string;
  text: string;
  imageUrl?: string;
  matchedProductIds?: string[];
  detectedLanguage?: Language;
  visualAnalysis?: string;
}): Promise<CrmConversation> {
  if (!auth.currentUser) throw new Error('Verified Admin authentication required.');
  const now = new Date().toISOString();
  const id = `crm-${params.channel}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const msgId = `msg-${Date.now().toString(36)}`;
  const inferredLang: Language =
    params.detectedLanguage ||
    (/[\u0980-\u09FF]/.test(params.text) || /\b(vai|bhai|koto|dam|ase|korbo|taka)\b/i.test(params.text)
      ? 'bn'
      : 'en');

  const firstMsg: CrmMessage = {
    id: msgId,
    sender: 'customer',
    text: params.text.trim() || (params.imageUrl ? 'Sent a product screenshot' : ''),
    imageUrl: params.imageUrl,
    matchedProductIds: params.matchedProductIds,
    visualAnalysis: params.visualAnalysis,
    timestamp: now,
  };

  const conv: CrmConversation = {
    id,
    channel: params.channel,
    customerId: params.customerPhone || params.customerHandle || id,
    customerName: params.customerName.trim() || 'Social Visitor',
    customerHandle: params.customerHandle?.trim() || undefined,
    customerPhone: params.customerPhone?.trim() || undefined,
    lastMessage: firstMsg.text,
    lastMessageAt: now,
    unreadCount: 1,
    status: 'open',
    detectedLanguage: inferredLang,
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
  extraUpdates?: Partial<Pick<CrmConversation, 'status' | 'matchedProductIds' | 'detectedLanguage' | 'unreadCount'>>
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
    new Set([...(conversation.matchedProductIds || []), ...(extraUpdates?.matchedProductIds || []), ...(message.matchedProductIds || [])])
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
    status: extraUpdates?.status || (message.sender !== 'customer' && conversation.status === 'open' ? 'negotiating' : conversation.status),
    matchedProductIds: mergedProductIds,
    detectedLanguage: extraUpdates?.detectedLanguage || conversation.detectedLanguage,
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
 * Call Server-Side Admin-Gated Gemini Vision + Sales Closer Copilot
 */
export async function requestAiSalesCopilot(params: {
  customerMessage: string;
  conversationHistory?: CrmMessage[];
  imageDataUri?: string;
  imageUrl?: string;
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

  // Hydrate matched products with full local catalog objects when available
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
      const fuzzyIds = fuzzyMatchProductsClient(text, catalog, 3).map((p) => p.id);
      const mergedMatchedIds = Array.from(
        new Set([...(Array.isArray(ev.aiMatchedProductIds) ? ev.aiMatchedProductIds : []), ...fuzzyIds])
      );

      let conv = existingConversations.find(
        (c) => c.channel === channel && c.customerId === customerId
      );

      if (conv) {
        conv = await appendMessageToConversation(
          conv,
          {
            sender: 'customer',
            text: text || 'Sent a photo',
            imageUrl: ev.imageUrl,
            matchedProductIds: mergedMatchedIds,
            visualAnalysis: ev.aiVisualAnalysis,
          },
          { unreadCount: (conv.unreadCount || 0) + 1, matchedProductIds: mergedMatchedIds }
        );
      } else {
        conv = await createInboundConversation({
          channel,
          customerName: String(ev.customerName || 'Social Customer'),
          customerHandle: ev.customerHandle,
          customerPhone: ev.customerPhone,
          text: text || 'Sent a photo',
          imageUrl: ev.imageUrl,
          matchedProductIds: mergedMatchedIds,
          detectedLanguage: ev.aiDetectedLanguage,
          visualAnalysis: ev.aiVisualAnalysis,
        });
      }

      // If backend webhook automatically generated (and optionally dispatched) a Gemini reply, record it in thread
      if (ev.aiAutoReply) {
        await appendMessageToConversation(
          conv,
          {
            sender: 'ai_assistant',
            text: String(ev.aiAutoReply),
            matchedProductIds: mergedMatchedIds,
            visualAnalysis: ev.aiVisualAnalysis,
            urgencyAngle: ev.aiUrgencyAngle,
          },
          {
            status: 'negotiating',
            matchedProductIds: mergedMatchedIds,
            unreadCount: ev.dispatchStatus?.startsWith('sent_live') ? 0 : 1,
          }
        );
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
 * Seed 4 realistic omnichannel DM inquiries using live store products (Admin-triggered)
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
      customerId: 'fb-tanvir-9102',
      customerName: 'Tanvir Ahmed',
      customerHandle: 'fb.com/tanvir.dhaka',
      lastMessage: 'Vai b72 earbud er last fixed dam koto? 100 taka kom hobe?',
      lastMessageAt: new Date(now - 1000 * 60 * 6).toISOString(),
      unreadCount: 1,
      status: 'negotiating',
      detectedLanguage: 'bn',
      matchedProductIds: earbudsProd ? [earbudsProd.id] : [],
      messages: [
        {
          id: 'm-seed-1a',
          sender: 'customer',
          text: 'Vai b72 earbud er last fixed dam koto? 100 taka kom hobe?',
          matchedProductIds: earbudsProd ? [earbudsProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 6).toISOString(),
        },
      ],
    },
    {
      channel: 'whatsapp',
      customerId: 'wa-01715442810',
      customerName: 'Nusrat Jahan',
      customerPhone: '01715-442810',
      lastMessage: 'এই ল্যাম্পটার ছবি পাঠালাম, অরিজিনাল হবে তো? ক্যাশ অন ডেলিভারিতে নেওয়া যাবে?',
      lastMessageAt: new Date(now - 1000 * 60 * 18).toISOString(),
      unreadCount: 1,
      status: 'open',
      detectedLanguage: 'bn',
      matchedProductIds: lampProd ? [lampProd.id] : [],
      messages: [
        {
          id: 'm-seed-2a',
          sender: 'customer',
          text: 'এই ল্যাম্পটার ছবি পাঠালাম, অরিজিনাল হবে তো? ক্যাশ অন ডেলিভারিতে নেওয়া যাবে?',
          imageUrl: lampProd?.image || undefined,
          matchedProductIds: lampProd ? [lampProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        },
      ],
    },
    {
      channel: 'instagram',
      customerId: 'ig-farhan_lux',
      customerName: 'Farhan Kabir',
      customerHandle: '@farhan_kabir_bd',
      lastMessage: `Hey! Is the ${watchProd?.nameEn || 'watch'} still in stock? How fast is Dhaka delivery?`,
      lastMessageAt: new Date(now - 1000 * 60 * 42).toISOString(),
      unreadCount: 1,
      status: 'open',
      detectedLanguage: 'en',
      matchedProductIds: watchProd ? [watchProd.id] : [],
      messages: [
        {
          id: 'm-seed-3a',
          sender: 'customer',
          text: `Hey! Is the ${watchProd?.nameEn || 'watch'} still in stock? How fast is Dhaka delivery?`,
          matchedProductIds: watchProd ? [watchProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
        },
      ],
    },
    {
      channel: 'tiktok',
      customerId: 'tt-sadia.reels',
      customerName: 'Sadia Afrin',
      customerHandle: '@sadia_reels99',
      lastMessage: 'calender night lamp ta ase? sylhet e pathaben kivabe',
      lastMessageAt: new Date(now - 1000 * 60 * 75).toISOString(),
      unreadCount: 0,
      status: 'ready_to_order',
      detectedLanguage: 'bn',
      matchedProductIds: lampProd ? [lampProd.id] : [],
      messages: [
        {
          id: 'm-seed-4a',
          sender: 'customer',
          text: 'calender night lamp ta ase? sylhet e pathaben kivabe',
          matchedProductIds: lampProd ? [lampProd.id] : [],
          timestamp: new Date(now - 1000 * 60 * 75).toISOString(),
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
