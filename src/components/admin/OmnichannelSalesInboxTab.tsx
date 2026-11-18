import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileAudio,
  Flame,
  Globe,
  History,
  ImagePlus,
  Instagram,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  MicOff,
  Package,
  PauseCircle,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { orderService } from '../../services/orderService';
import {
  AiTrainingConfig,
  ChannelConnectionConfig,
  ConversationAiMode,
  CrmConversation,
  CrmEntryType,
  Language,
  Order,
  OrderSourceChannel,
  Product,
  SalesCopilotResult,
  SocialChannel,
} from '../../types';
import {
  appendMessageToConversation,
  bookCourierParcel,
  calculateDeliveryCharge,
  compressChatImageFile,
  createInboundConversation,
  DEFAULT_AI_TRAINING_CONFIG,
  DEFAULT_CHANNEL_CONFIGS,
  deleteConversation,
  dispatchLiveChannelReply,
  ensureDefaultChannelConfigs,
  escalateConversationTicket,
  fuzzyMatchProductsClient,
  markConversationRead,
  readAudioFileAsDataUri,
  requestAiSalesCopilot,
  resolveEscalationTicket,
  saveChannelConfig,
  saveExtractedOrderDraft,
  savePendingAiDraft,
  seedSampleOmnichannelConversations,
  subscribeToAiTrainingConfig,
  subscribeToChannelConfigs,
  subscribeToCrmConversations,
  syncChannelConfigsToServer,
  syncPendingWebhookEvents,
  transcribeVoiceNote,
  updateConversationAiMode,
  updateConversationStatus,
} from '../../services/omnichannelCrmService';
import { getProductShareUrl } from '../../services/shareService';
import { PrintableInvoiceModal } from './PrintableInvoiceModal';

const CHANNEL_META: Record<
  SocialChannel,
  { label: string; short: string; color: string; badgeBg: string; border: string }
> = {
  messenger: {
    label: 'Facebook Messenger',
    short: 'Messenger',
    color: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/30',
  },
  whatsapp: {
    label: 'WhatsApp Business',
    short: 'WhatsApp',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
  },
  instagram: {
    label: 'Instagram Direct',
    short: 'Instagram',
    color: 'text-pink-400',
    badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    border: 'border-pink-500/30',
  },
  tiktok: {
    label: 'TikTok Business DM',
    short: 'TikTok',
    color: 'text-violet-300',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    border: 'border-violet-500/30',
  },
  web: {
    label: 'Website Live Chat',
    short: 'Web Chat',
    color: 'text-[#D4AF37]',
    badgeBg: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
    border: 'border-[#D4AF37]/30',
  },
};

const STATUS_META: Record<
  CrmConversation['status'],
  { labelEn: string; labelBn: string; cls: string }
> = {
  open: {
    labelEn: 'New Lead',
    labelBn: 'নতুন মেসেজ',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  negotiating: {
    labelEn: 'Closing / Pitching',
    labelBn: 'আলোচনা চলছে',
    cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  ready_to_order: {
    labelEn: 'Ready to Order',
    labelBn: 'অর্ডারের জন্য প্রস্তুত',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  converted: {
    labelEn: 'Converted Sale',
    labelBn: 'সেল কনফার্মড',
    cls: 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40',
  },
  resolved: {
    labelEn: 'Closed / Resolved',
    labelBn: 'সম্পন্ন',
    cls: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  },
};

const AI_MODE_META: Record<
  ConversationAiMode,
  { label: string; cls: string }
> = {
  auto_pilot: {
    label: 'AI Auto-Pilot',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  review_mode: {
    label: 'Review Mode',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  human_takeover: {
    label: 'Human Takeover',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

function ChannelBadgeIcon({ channel, className = 'w-3.5 h-3.5' }: { channel: SocialChannel; className?: string }) {
  switch (channel) {
    case 'messenger':
      return <MessageCircle className={className} />;
    case 'whatsapp':
      return <Phone className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'tiktok':
      return <Video className={className} />;
    case 'web':
      return <Globe className={className} />;
  }
}

type QueueFilter = 'all' | 'unread' | 'comments' | 'review' | 'escalated';

export const OmnichannelSalesInboxTab: React.FC = () => {
  const { isAdmin, isSuperAdmin, user, language, products, addToast } = useApp();

  const [conversations, setConversations] = useState<CrmConversation[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConnectionConfig[]>(DEFAULT_CHANNEL_CONFIGS);
  const [aiTrainingConfig, setAiTrainingConfig] = useState<AiTrainingConfig>(DEFAULT_AI_TRAINING_CONFIG);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | SocialChannel>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [threadSearch, setThreadSearch] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Reply Composer & AI Sales Copilot State
  const [replyDraft, setReplyDraft] = useState('');
  const [replyMode, setReplyMode] = useState<'customer' | 'admin'>('admin');
  const [preferredReplyLang, setPreferredReplyLang] = useState<'auto' | Language>('auto');
  const [estimatorDistrict, setEstimatorDistrict] = useState('Dhaka');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [copilotInsight, setCopilotInsight] = useState<SalesCopilotResult | null>(null);
  const [composerImageDataUri, setComposerImageDataUri] = useState<string | null>(null);
  const [composerAudioDataUri, setComposerAudioDataUri] = useState<string | null>(null);

  // Right Rail Tab: Customer 360° vs Catalog Matcher
  const [rightRailTab, setRightRailTab] = useState<'catalog' | 'customer'>('catalog');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Modals: New/Test DM & Webhook Channels Setup
  const [isNewDmModalOpen, setIsNewDmModalOpen] = useState(false);
  const [newDmChannel, setNewDmChannel] = useState<SocialChannel>('messenger');
  const [newDmEntryType, setNewDmEntryType] = useState<CrmEntryType>('dm');
  const [newDmPostTitle, setNewDmPostTitle] = useState('');
  const [newDmName, setNewDmName] = useState('');
  const [newDmHandle, setNewDmHandle] = useState('');
  const [newDmText, setNewDmText] = useState('');
  const [newDmImageUri, setNewDmImageUri] = useState<string | null>(null);
  const [newDmAudioUri, setNewDmAudioUri] = useState<string | null>(null);
  const [newDmAutoCopilot, setNewDmAutoCopilot] = useState(true);
  const [isCreatingDm, setIsCreatingDm] = useState(false);

  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [editingChannels, setEditingChannels] = useState<ChannelConnectionConfig[]>(DEFAULT_CHANNEL_CONFIGS);
  const [isSavingChannels, setIsSavingChannels] = useState(false);

  // Escalation Modal
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
  const [escRole, setEscRole] = useState<'supervisor' | 'staff'>('supervisor');
  const [escPriority, setEscPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [escReason, setEscReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  // Inline Order Processing + Invoice Print + Courier Booking Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderProductId, setOrderProductId] = useState('');
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderDistrict, setOrderDistrict] = useState('Dhaka');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [bookingOrderId, setBookingOrderId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const composerAudioInputRef = useRef<HTMLInputElement | null>(null);
  const newDmFileInputRef = useRef<HTMLInputElement | null>(null);
  const newDmAudioInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Combine store catalog + synced external catalog items into unified searchable catalog
  const unifiedCatalog = useMemo<Product[]>(() => {
    const ext: Product[] = (aiTrainingConfig.externalCatalog || []).map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      nameBn: item.nameBn || item.nameEn,
      taglineEn: `${item.brand} • Synced (${item.source})`,
      taglineBn: `${item.brand} • সিঙ্কড`,
      descriptionEn: `Synced from ${item.source}`,
      descriptionBn: `সিঙ্কড প্রোডাক্ট`,
      specs: [],
      price: item.price,
      originalPrice: item.originalPrice,
      category: item.category || 'gadgets',
      brand: item.brand || 'Luxora',
      image:
        item.image ||
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
      images: [],
      rating: 4.9,
      reviewsCount: 18,
      inStock: item.inStock,
      stockCount: item.stockCount,
      freeDelivery: item.freeDelivery,
      sku: item.sku,
    }));
    const existingIds = new Set(products.map((p) => p.id));
    return [...products, ...ext.filter((e) => !existingIds.has(e.id))];
  }, [products, aiTrainingConfig.externalCatalog]);

  const conversationsRef = useRef<CrmConversation[]>(conversations);
  conversationsRef.current = conversations;
  const productsRef = useRef<Product[]>(unifiedCatalog);
  productsRef.current = unifiedCatalog;

  // Subscribe to real-time CRM conversations, Channel configs, AI training, & orders
  useEffect(() => {
    if (!isAdmin) return;
    ensureDefaultChannelConfigs().catch(() => {});

    const unsubConvs = subscribeToCrmConversations(
      (items) => {
        setConversations(items);
        setIsLoadingInbox(false);
        setSelectedConvId((prev) => {
          if (prev && items.some((c) => c.id === prev)) return prev;
          return items[0]?.id || null;
        });
      },
      () => {
        setIsLoadingInbox(false);
      }
    );

    const unsubChannels = subscribeToChannelConfigs((cfgs) => {
      setChannelConfigs(cfgs);
      setEditingChannels(cfgs);
      syncChannelConfigsToServer(cfgs).catch(() => {});
    });

    const unsubTraining = subscribeToAiTrainingConfig((cfg) => {
      setAiTrainingConfig(cfg);
    });

    orderService
      .getAllOrders()
      .then((ords) => setAllOrders(ords))
      .catch(() => {});

    return () => {
      unsubConvs();
      unsubChannels();
      unsubTraining();
    };
  }, [isAdmin]);

  // Periodically drain any incoming Meta/WhatsApp/IG/TikTok/Web webhook payloads while Inbox is active
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      const count = await syncPendingWebhookEvents(conversationsRef.current, productsRef.current);
      if (count > 0 && active) {
        addToast({
          type: 'info',
          titleEn: `${count} New Customer Inquiry Synced`,
          titleBn: `${count}টি নতুন কাস্টমার মেসেজ এসেছে`,
          descriptionEn: 'Updated live in Omnichannel AI Sales Inbox.',
        });
      }
    };
    poll();
    const timer = setInterval(poll, 7000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAdmin, addToast]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConvId) || null,
    [conversations, selectedConvId]
  );

  // Clear unread indicator when opening a thread
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      markConversationRead(selectedConversation.id);
    }
    setCopilotInsight(null);
  }, [selectedConversation?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages?.length]);

  const queueCounts = useMemo(() => {
    return {
      all: conversations.length,
      unread: conversations.filter((c) => (c.unreadCount || 0) > 0).length,
      comments: conversations.filter(
        (c) => c.entryType === 'comment' || c.messages?.some((m) => m.entryType === 'comment')
      ).length,
      review: conversations.filter((c) => Boolean(c.pendingAiDraft)).length,
      escalated: conversations.filter((c) => c.escalation?.isEscalated).length,
    };
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = threadSearch.toLowerCase().trim();
    return conversations.filter((conv) => {
      const matchesChannel = channelFilter === 'all' || conv.channel === channelFilter;
      const matchesQueue =
        queueFilter === 'all'
          ? true
          : queueFilter === 'unread'
            ? (conv.unreadCount || 0) > 0
            : queueFilter === 'comments'
              ? conv.entryType === 'comment' || conv.messages?.some((m) => m.entryType === 'comment')
              : queueFilter === 'review'
                ? Boolean(conv.pendingAiDraft)
                : Boolean(conv.escalation?.isEscalated);

      const matchesQuery =
        !q ||
        conv.customerName.toLowerCase().includes(q) ||
        (conv.customerHandle || '').toLowerCase().includes(q) ||
        (conv.customerPhone || '').toLowerCase().includes(q) ||
        (conv.postTitleOrId || '').toLowerCase().includes(q) ||
        (conv.escalation?.ticketId || '').toLowerCase().includes(q) ||
        conv.lastMessage.toLowerCase().includes(q);
      return matchesChannel && matchesQueue && matchesQuery;
    });
  }, [conversations, channelFilter, queueFilter, threadSearch]);

  const unreadByChannel = useMemo(() => {
    const counts: Record<'all' | SocialChannel, number> = {
      all: 0,
      messenger: 0,
      whatsapp: 0,
      instagram: 0,
      tiktok: 0,
      web: 0,
    };
    for (const c of conversations) {
      const u = c.unreadCount || 0;
      counts.all += u;
      counts[c.channel] = (counts[c.channel] || 0) + u;
    }
    return counts;
  }, [conversations]);

  // Customer Past Orders lookup (matching phone digits, handle, or exact customer name)
  const customerPastOrders = useMemo(() => {
    if (!selectedConversation) return [];
    const cleanPhone = (selectedConversation.customerPhone || '').replace(/[^0-9]/g, '').slice(-8);
    const cleanName = (selectedConversation.customerName || '').toLowerCase().trim();

    return allOrders.filter((ord) => {
      const ordPhone = (ord.customer?.phone || '').replace(/[^0-9]/g, '').slice(-8);
      if (cleanPhone.length >= 6 && ordPhone && ordPhone === cleanPhone) return true;
      if (cleanName && cleanName.length >= 4 && (ord.customer?.name || '').toLowerCase().includes(cleanName)) {
        return true;
      }
      return false;
    });
  }, [selectedConversation, allOrders]);

  // Matched products for active thread + live fuzzy catalog search in right rail
  const activeMatchedProducts = useMemo(() => {
    const idMap = new Map<string, Product>();
    if (copilotInsight?.matchedProducts) {
      for (const p of copilotInsight.matchedProducts) idMap.set(p.id, p);
    }
    if (selectedConversation?.matchedProductIds) {
      for (const id of selectedConversation.matchedProductIds) {
        const found = unifiedCatalog.find((p) => p.id === id);
        if (found) idMap.set(found.id, found);
      }
    }
    if (selectedConversation && idMap.size === 0) {
      const lastCust = [...(selectedConversation.messages || [])]
        .reverse()
        .find((m) => m.sender === 'customer');
      if (lastCust?.text || lastCust?.audioTranscript) {
        for (const p of fuzzyMatchProductsClient(
          `${lastCust.text} ${lastCust.audioTranscript || ''}`,
          unifiedCatalog,
          3
        )) {
          idMap.set(p.id, p);
        }
      }
    }
    return Array.from(idMap.values());
  }, [copilotInsight, selectedConversation, unifiedCatalog]);

  const fuzzySearchResults = useMemo(() => {
    if (!catalogSearchQuery.trim()) {
      return unifiedCatalog.filter((p) => p.inStock && (p.stockCount ?? 1) > 0).slice(0, 6);
    }
    return fuzzyMatchProductsClient(catalogSearchQuery, unifiedCatalog, 8);
  }, [catalogSearchQuery, unifiedCatalog]);

  const activeDeliveryQuote = useMemo(() => {
    const leadProd = activeMatchedProducts[0];
    return calculateDeliveryCharge(
      estimatorDistrict,
      leadProd?.price || 0,
      Boolean(leadProd?.freeDelivery)
    );
  }, [estimatorDistrict, activeMatchedProducts]);

  const handleRunSalesCopilot = async (
    tactic: 'balanced' | 'fixed_price_urgency' | 'handle_objection' | 'close_order' = 'balanced',
    targetConv?: CrmConversation,
    overrideMsg?: string,
    overrideImage?: string,
    overrideAudio?: string
  ) => {
    const conv = targetConv || selectedConversation;
    if (!conv) return;

    const latestCustomerMsg = [...(conv.messages || [])]
      .reverse()
      .find((m) => m.sender === 'customer');
    const queryText =
      overrideMsg ?? latestCustomerMsg?.audioTranscript ?? latestCustomerMsg?.text ?? conv.lastMessage ?? '';
    const imageToInspect = overrideImage ?? latestCustomerMsg?.imageUrl;
    const audioToInspect = overrideAudio ?? latestCustomerMsg?.audioDataUri;

    setIsGeneratingAi(true);
    try {
      const result = await requestAiSalesCopilot({
        customerMessage: queryText,
        conversationHistory: conv.messages,
        imageDataUri: imageToInspect?.startsWith('data:image/') ? imageToInspect : undefined,
        imageUrl: imageToInspect && !imageToInspect.startsWith('data:image/') ? imageToInspect : undefined,
        audioDataUri: audioToInspect,
        entryType: latestCustomerMsg?.entryType || conv.entryType,
        postTitleOrId: latestCustomerMsg?.postTitleOrId || conv.postTitleOrId,
        customerDistrict: estimatorDistrict,
        preferredLanguage: preferredReplyLang,
        tacticOverride: tactic,
        catalog: unifiedCatalog,
      });

      setCopilotInsight(result);
      setReplyDraft(result.salesReply);
      setReplyMode('admin');

      if (result.extractedOrder?.hasOrderIntent) {
        await saveExtractedOrderDraft(conv.id, result.extractedOrder).catch(() => {});
      }

      // Auto-escalate when AI detects a refund/damage/complaint escalation
      if (result.requiresEscalation && !conv.escalation?.isEscalated) {
        await escalateConversationTicket(conv.id, {
          priority: result.escalationPriority || 'high',
          assignedRole: 'supervisor',
          reason: result.escalationReason || 'Customer complaint / defect escalation detected by Gemini AI',
          escalatedBy: 'Luxora AI Triage',
        }).catch(() => {});
      }

      // If conversation is in Review Mode, store as pendingAiDraft for team inspection too
      if (conv.aiMode === 'review_mode') {
        await savePendingAiDraft(conv.id, {
          text: result.salesReply,
          alternateText: result.salesReplyAlternate,
          intent: result.customerIntent,
          urgencyAngle: result.urgencyAngle,
          visualAnalysis: result.visualAnalysis,
          matchedProductIds: result.matchedProducts.map((p) => p.id),
          deliveryQuote: result.deliveryQuote,
          createdAt: new Date().toISOString(),
        }).catch(() => {});
      }

      addToast({
        type: 'success',
        titleEn: 'AI Sales Pitch Ready',
        titleBn: 'এআই সেলস রিপ্লাই প্রস্তুত',
        descriptionEn:
          result.matchedProducts.length > 0
            ? `Matched ${result.matchedProducts.length} product(s) using ${result.provider}`
            : `Crafted closing strategy via ${result.provider}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'AI Copilot Error',
        titleBn: 'এআই কপাইলট ত্রুটি',
        descriptionEn: err?.message || 'Unable to generate AI pitch right now.',
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendComposerMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation) return;
    const text = replyDraft.trim();
    if (!text && !composerImageDataUri && !composerAudioDataUri) return;

    setIsSendingMsg(true);
    try {
      const matchedIds = activeMatchedProducts.map((p) => p.id);
      const isHumanManualReply = replyMode === 'admin' && !copilotInsight;
      let transcriptText = '';

      if (composerAudioDataUri && replyMode === 'customer') {
        setIsTranscribingAudio(true);
        try {
          const tr = await transcribeVoiceNote(composerAudioDataUri);
          transcriptText = tr.transcript;
        } catch {
          transcriptText = '';
        } finally {
          setIsTranscribingAudio(false);
        }
      }

      const updated = await appendMessageToConversation(
        selectedConversation,
        {
          sender: replyMode === 'customer' ? 'customer' : copilotInsight ? 'ai_assistant' : 'admin',
          entryType: composerAudioDataUri ? 'voice_note' : selectedConversation.entryType,
          text:
            text ||
            (transcriptText
              ? `Voice note: ${transcriptText}`
              : composerAudioDataUri
                ? 'Sent a voice message'
                : 'Sent a product screenshot'),
          imageUrl: composerImageDataUri || undefined,
          audioDataUri: composerAudioDataUri || undefined,
          audioTranscript: transcriptText || undefined,
          matchedProductIds: matchedIds,
          visualAnalysis: copilotInsight?.visualAnalysis,
          urgencyAngle: copilotInsight?.urgencyAngle,
          deliveryQuote: copilotInsight?.deliveryQuote,
          aiStatus: copilotInsight ? 'approved' : undefined,
        },
        {
          matchedProductIds: matchedIds,
          detectedLanguage: copilotInsight?.detectedLanguage || selectedConversation.detectedLanguage,
          unreadCount: replyMode === 'customer' ? 1 : 0,
          pendingAiDraft: undefined,
        }
      );

      if (replyMode === 'admin' && text && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }

      // Clear pending draft if approved manually
      if (replyMode === 'admin' && selectedConversation.pendingAiDraft) {
        await savePendingAiDraft(selectedConversation.id, null).catch(() => {});
      }

      const usedAudio = composerAudioDataUri;
      const usedImg = composerImageDataUri;
      setReplyDraft('');
      setComposerImageDataUri(null);
      setComposerAudioDataUri(null);

      if (replyMode === 'customer') {
        setReplyMode('admin');
        if (selectedConversation.aiMode !== 'human_takeover') {
          await handleRunSalesCopilot(
            'balanced',
            updated,
            transcriptText || text,
            usedImg || undefined,
            usedAudio || undefined
          );
        }
      } else {
        const liveRes = text
          ? await dispatchLiveChannelReply({
              channel: selectedConversation.channel,
              customerId: selectedConversation.customerId,
              customerPhone: selectedConversation.customerPhone,
              text,
            })
          : null;

        addToast({
          type: 'success',
          titleEn: liveRes?.dispatchedLive
            ? 'Reply Sent Live & Saved'
            : isHumanManualReply
              ? 'Manual Agent Reply Saved'
              : 'Reply Logged & Copied',
          titleBn: liveRes?.dispatchedLive ? 'রিপ্লাই সরাসরি পাঠানো হয়েছে' : 'রিপ্লাই সেভ ও কপি হয়েছে',
          descriptionEn: liveRes?.dispatchedLive
            ? liveRes.detail
            : 'Saved to thread & copied to clipboard.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Send Message',
        titleBn: 'মেসেজ পাঠাতে ব্যর্থ',
        descriptionEn: err?.message || 'Could not update conversation.',
      });
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleToggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const dataUri = await readAudioFileAsDataUri(blob);
        setComposerAudioDataUri(dataUri);
        setReplyMode('customer');
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Microphone Unavailable',
        titleBn: 'মাইক্রোফোন চালু করা যায়নি',
        descriptionEn: err?.message || 'Grant mic permission or upload an audio clip instead.',
      });
    }
  };

  const handleComposerAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uri = await readAudioFileAsDataUri(file);
      setComposerAudioDataUri(uri);
      setIsTranscribingAudio(true);
      const res = await transcribeVoiceNote(uri);
      if (res.transcript) {
        setReplyDraft((prev) => (prev ? `${prev}\n${res.transcript}` : res.transcript));
      }
      addToast({
        type: 'success',
        titleEn: 'Voice Note Transcribed',
        titleBn: 'ভয়েস নোট ট্রান্সক্রাইব সম্পন্ন',
        descriptionEn: `Transcribed via ${res.provider}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Audio Transcription Notice',
        titleBn: 'ভয়েস প্রসেস করতে সমস্যা',
        descriptionEn: err?.message || 'Could not process audio clip.',
      });
    } finally {
      setIsTranscribingAudio(false);
      e.target.value = '';
    }
  };

  const handleComposerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressChatImageFile(file);
      setComposerImageDataUri(compressed);
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Image Upload Failed',
        titleBn: 'ছবি আপলোড ব্যর্থ হয়েছে',
        descriptionEn: err?.message || 'Invalid image format.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleNewDmImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressChatImageFile(file);
      setNewDmImageUri(compressed);
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Image Failed',
        titleBn: 'ছবি প্রসেস ব্যর্থ হয়েছে',
        descriptionEn: err?.message || 'Could not process screenshot.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleNewDmAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uri = await readAudioFileAsDataUri(file);
      setNewDmAudioUri(uri);
    } catch {
      addToast({
        type: 'error',
        titleEn: 'Audio Load Failed',
        titleBn: 'অডিও লোড ব্যর্থ',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleCreateInboundDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDmText.trim() && !newDmImageUri && !newDmAudioUri) return;

    setIsCreatingDm(true);
    try {
      let transcript: string | undefined;
      if (newDmAudioUri) {
        try {
          const tr = await transcribeVoiceNote(newDmAudioUri);
          transcript = tr.transcript;
        } catch {
          transcript = undefined;
        }
      }

      const fuzzyIds = fuzzyMatchProductsClient(
        `${newDmText} ${transcript || ''}`,
        unifiedCatalog,
        3
      ).map((p) => p.id);

      const created = await createInboundConversation({
        channel: newDmChannel,
        entryType: newDmAudioUri
          ? 'voice_note'
          : newDmChannel === 'web'
            ? 'web_chat'
            : newDmEntryType,
        postTitleOrId: newDmEntryType === 'comment' ? newDmPostTitle.trim() || 'Featured Social Post' : undefined,
        customerName: newDmName.trim() || `${CHANNEL_META[newDmChannel].short} Shopper`,
        customerHandle: newDmHandle.trim() || undefined,
        text: newDmText.trim() || (transcript ? `Voice note: ${transcript}` : 'Sent a product screenshot'),
        imageUrl: newDmImageUri || undefined,
        audioDataUri: newDmAudioUri || undefined,
        audioTranscript: transcript,
        matchedProductIds: fuzzyIds,
      });

      setSelectedConvId(created.id);
      setIsNewDmModalOpen(false);
      setNewDmName('');
      setNewDmHandle('');
      setNewDmText('');
      setNewDmPostTitle('');
      setNewDmImageUri(null);
      setNewDmAudioUri(null);

      if (newDmAutoCopilot) {
        await handleRunSalesCopilot(
          'balanced',
          created,
          transcript || created.messages[0].text,
          created.messages[0].imageUrl,
          created.messages[0].audioDataUri
        );
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Error Logging DM',
        titleBn: 'মেসেজ সেভ করতে ত্রুটি',
        descriptionEn: err?.message || 'Failed to create CRM thread.',
      });
    } finally {
      setIsCreatingDm(false);
    }
  };

  const handleApprovePendingDraft = async () => {
    if (!selectedConversation?.pendingAiDraft) return;
    const draft = selectedConversation.pendingAiDraft;
    setIsSendingMsg(true);
    try {
      await appendMessageToConversation(
        selectedConversation,
        {
          sender: 'ai_assistant',
          entryType: selectedConversation.entryType,
          text: draft.text,
          matchedProductIds: draft.matchedProductIds,
          visualAnalysis: draft.visualAnalysis,
          urgencyAngle: draft.urgencyAngle,
          deliveryQuote: draft.deliveryQuote,
          aiStatus: 'approved',
        },
        {
          status: 'negotiating',
          unreadCount: 0,
          pendingAiDraft: undefined,
        }
      );
      await savePendingAiDraft(selectedConversation.id, null);

      const liveRes = await dispatchLiveChannelReply({
        channel: selectedConversation.channel,
        customerId: selectedConversation.customerId,
        customerPhone: selectedConversation.customerPhone,
        text: draft.text,
      });

      addToast({
        type: 'success',
        titleEn: liveRes.dispatchedLive ? 'Approved & Dispatched Live' : 'Draft Approved & Logged',
        titleBn: 'ড্রাফট অনুমোদিত ও পাঠানো হয়েছে',
        descriptionEn: liveRes.detail,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Approve Draft',
        titleBn: 'ড্রাফট অনুমোদন ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation) return;
    setIsEscalating(true);
    try {
      const ticket = await escalateConversationTicket(selectedConversation.id, {
        priority: escPriority,
        assignedRole: escRole,
        reason: escReason,
        escalatedBy: user?.email || 'Admin Agent',
      });
      setIsEscalationModalOpen(false);
      setEscReason('');
      addToast({
        type: 'warning',
        titleEn: `Escalated Ticket ${ticket.ticketId}`,
        titleBn: `টিকেট ${ticket.ticketId} এসকেলেট হয়েছে`,
        descriptionEn: `Assigned to ${escRole.toUpperCase()} (${escPriority.toUpperCase()}). AI paused for human takeover.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Escalation Failed',
        titleBn: 'এসকেলেট করতে ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsEscalating(false);
    }
  };

  const handleOneClickBookCourier = async (order: Order, provider: 'steadfast' | 'pathao') => {
    setBookingOrderId(order.id);
    try {
      const codAmount =
        order.paymentStatus === 'paid'
          ? 0
          : Number(order.paymentDetails?.dueAmount ?? order.totalAmount);
      const res = await bookCourierParcel({
        orderId: order.id,
        provider,
        customer: order.customer,
        totalAmount: order.totalAmount,
        codAmount,
        note: order.customer?.notes,
      });
      await orderService.updateOrderStatus(order.id, 'In Transit', res.trackingInfo);
      setAllOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, orderStatus: 'In Transit', trackingInfo: res.trackingInfo } : o
        )
      );
      addToast({
        type: 'success',
        titleEn: `${provider.toUpperCase()} Parcel Booked`,
        titleBn: `${provider.toUpperCase()} পার্সেল বুকড`,
        descriptionEn: `${res.message} (CN: ${res.trackingInfo.consignmentId})`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Courier Booking Failed',
        titleBn: 'কুরিয়ার বুকিং ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setBookingOrderId(null);
    }
  };

  const handleOpenProcessOrderModal = (conv: CrmConversation) => {
    const ext = conv.extractedOrderDraft;
    const defaultProd =
      (ext?.productId ? unifiedCatalog.find((p) => p.id === ext.productId) : null) ||
      activeMatchedProducts[0] ||
      unifiedCatalog[0];
    setOrderProductId(defaultProd?.id || '');
    setOrderCustomerName(ext?.customerName || conv.customerName || '');
    setOrderCustomerPhone(ext?.customerPhone || conv.customerPhone || '');
    setOrderDistrict(ext?.district || estimatorDistrict || 'Dhaka');
    setOrderAddress(ext?.address || '');
    setOrderQty(ext?.quantity || 1);
    setOrderNotes(`Converted from ${CHANNEL_META[conv.channel].label} (${conv.id})`);
    setIsOrderModalOpen(true);
  };

  const handleInjectProductIntoReply = (prod: Product) => {
    const url = getProductShareUrl(prod.id);
    const priceFmt = `৳${prod.price.toLocaleString('en-IN')}`;
    const quote = calculateDeliveryCharge(estimatorDistrict, prod.price, Boolean(prod.freeDelivery));
    const deliveryNote =
      quote.charge === 0
        ? `Free Delivery (${quote.freeReason || 'VIP'})`
        : `${quote.district} Delivery: ৳${quote.charge}`;

    const snippet =
      copilotInsight?.detectedLanguage === 'bn' || selectedConversation?.detectedLanguage === 'bn'
        ? `\n\n✨ ${prod.nameEn} — ফিক্সড প্রাইস: ${priceFmt} (${deliveryNote})\n🔗 দেখুন ও অর্ডার করুন: ${url}`
        : `\n\n✨ ${prod.nameEn} — Fixed Price: ${priceFmt} (${deliveryNote})\n🔗 View & Order: ${url}`;

    setReplyDraft((prev) => `${prev.trim()}${snippet}`.trim());
    setReplyMode('admin');
  };

  const handleCopyProductLink = (prod: Product) => {
    const url = getProductShareUrl(prod.id);
    navigator.clipboard?.writeText(url);
    addToast({
      type: 'info',
      titleEn: 'Product Link Copied',
      titleBn: 'প্রোডাক্ট লিংক কপি হয়েছে',
      descriptionEn: url,
    });
  };

  const handleSeedDemoInbox = async () => {
    setIsSeeding(true);
    try {
      const count = await seedSampleOmnichannelConversations(unifiedCatalog);
      addToast({
        type: 'success',
        titleEn: `Loaded ${count} Omnichannel Threads`,
        titleBn: `${count}টি স্যাম্পল চ্যাট লোড হয়েছে`,
        descriptionEn: 'Messenger Review Mode, IG Reel Comment, WhatsApp Order Intent, Web Chat & TikTok loaded.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Load Samples',
        titleBn: 'স্যাম্পল লোড করতে ব্যর্থ',
        descriptionEn: err?.message || 'Permission error.',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSaveChannelConfigs = async () => {
    setIsSavingChannels(true);
    try {
      for (const cfg of editingChannels) {
        await saveChannelConfig(cfg);
      }
      await syncChannelConfigsToServer(editingChannels);
      setIsChannelSettingsOpen(false);
      addToast({
        type: 'success',
        titleEn: 'Omnichannel Connections Updated & Synced',
        titleBn: 'চ্যানেল সেটিংস সেভ ও সিঙ্ক হয়েছে',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Save Channels',
        titleBn: 'চ্যানেল সেটিংস সেভ ব্যর্থ',
        descriptionEn: err?.message || 'Firestore write error.',
      });
    } finally {
      setIsSavingChannels(false);
    }
  };

  const webhookEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/omnichannel`
      : '/api/webhooks/omnichannel';

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Unified AI Inbox Command Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#151822] to-[#12141A] border border-[#D4AF37]/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40">
              <ShieldCheck className="w-3 h-3" />
              Unified Pressway-Style Sales CRM
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              BN/EN/Banglish · Voice + Vision + Auto-Order
            </span>
            {queueCounts.escalated > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {queueCounts.escalated} Escalated Ticket(s)
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-display font-semibold text-white">
            {language === 'bn'
              ? 'ইউনিফায়েড অমনিচ্যানেল এআই সেলস ইনবক্স'
              : 'Unified Omnichannel AI Sales Inbox'}
          </h2>
          <p className="text-xs text-neutral-400">
            {language === 'bn'
              ? 'Messenger, Instagram, WhatsApp, TikTok ও Web Chat-এর ডিরেক্ট মেসেজ, কমেন্ট এবং ভয়েস নোট এক জায়গায় AI ও Human Review মোডে পরিচালনা করুন।'
              : 'Manage Messenger, Instagram, WhatsApp, TikTok DMs, Post Comments & Live Web Chat with voice transcription, Human-in-the-Loop controls & instant order conversion.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsChannelSettingsOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#1A1D26] hover:bg-[#232734] border border-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{language === 'bn' ? 'চ্যানেল ও ওয়েবহুক' : 'Quick Channel Config'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewDmModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন ইনকামিং DM / কমেন্ট / ভয়েস' : 'Log DM / Comment / Voice'}</span>
          </button>
        </div>
      </div>

      {/* Platform Filter Tabs + Queue Type Pills */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setChannelFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap border transition-all cursor-pointer ${
              channelFilter === 'all'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                : 'bg-[#12141A] text-neutral-300 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>All Channels</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25">{conversations.length}</span>
          </button>

          {(['messenger', 'whatsapp', 'instagram', 'tiktok', 'web'] as SocialChannel[]).map((ch) => {
            const meta = CHANNEL_META[ch];
            const cfg = channelConfigs.find((c) => c.id === ch);
            const count = conversations.filter((c) => c.channel === ch).length;
            const unread = unreadByChannel[ch] || 0;
            const active = channelFilter === ch;

            return (
              <button
                key={ch}
                type="button"
                onClick={() => setChannelFilter(ch)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap border transition-all cursor-pointer ${
                  active
                    ? 'bg-[#1E2230] text-white border-[#D4AF37]/60'
                    : 'bg-[#12141A] text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span className={meta.color}>
                  <ChannelBadgeIcon channel={ch} />
                </span>
                <span>{meta.short}</span>
                <span className="text-[10px] text-neutral-400">({count})</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unread}
                  </span>
                )}
                {cfg?.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Sub-Queue Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {(
            [
              { id: 'all', label: `All (${queueCounts.all})` },
              { id: 'unread', label: `Unread (${queueCounts.unread})` },
              { id: 'comments', label: `Post Comments (${queueCounts.comments})` },
              { id: 'review', label: `AI Review Pending (${queueCounts.review})` },
              { id: 'escalated', label: `Escalated Tickets (${queueCounts.escalated})` },
            ] as Array<{ id: QueueFilter; label: string }>
          ).map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setQueueFilter(pill.id)}
              className={`px-3 py-1 rounded-full border transition-all cursor-pointer ${
                queueFilter === pill.id
                  ? pill.id === 'escalated'
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-semibold'
                    : 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37] font-semibold'
                  : 'bg-[#12141A] border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3-Pane CRM Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[680px]">
        {/* LEFT PANE: Thread Queue (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[820px]">
          <div className="p-3 border-b border-neutral-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder={language === 'bn' ? 'কাস্টমার, টিকেট বা মেসেজ...' : 'Search customer, ticket, post...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/70">
            {isLoadingInbox ? (
              <div className="py-16 flex flex-col items-center justify-center text-neutral-400 gap-2 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                <span>Loading unified inbox...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-5 text-center space-y-3 my-6">
                <Bot className="w-8 h-8 text-[#D4AF37] mx-auto opacity-80" />
                <div className="text-xs font-semibold text-white">No Matching Threads</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Load omnichannel sample threads (Review Mode, Post Comment, Web Chat, WhatsApp Order Intent) or log a custom DM.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSeeding}
                    onClick={handleSeedDemoInbox}
                    className="px-3 py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Load 5 Channel Samples</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewDmModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-[#1A1D26] hover:bg-[#242834] border border-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer"
                  >
                    + Log Custom DM / Comment
                  </button>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const chMeta = CHANNEL_META[conv.channel];
                const stMeta = STATUS_META[conv.status];
                const isComment = conv.entryType === 'comment';
                const hasPendingReview = Boolean(conv.pendingAiDraft);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-[#191C26] border-l-2 border-l-[#D4AF37]' : 'hover:bg-[#161822]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1 rounded-lg border ${chMeta.badgeBg} shrink-0`}>
                          <ChannelBadgeIcon channel={conv.channel} className="w-3 h-3" />
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {conv.customerName}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Indicator Pills (Comment / Review / Escalated / Extracted Order) */}
                    {(isComment || hasPendingReview || conv.escalation?.isEscalated || conv.extractedOrderDraft?.hasOrderIntent) && (
                      <div className="flex flex-wrap gap-1">
                        {isComment && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-medium">
                            Post Comment
                          </span>
                        )}
                        {hasPendingReview && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-semibold">
                            AI Draft Pending
                          </span>
                        )}
                        {conv.escalation?.isEscalated && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold">
                            {conv.escalation.ticketId || 'Escalated'}
                          </span>
                        )}
                        {conv.extractedOrderDraft?.hasOrderIntent && !conv.extractedOrderDraft?.confirmedOrderId && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-semibold">
                            Order Intent
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-snug">
                      {conv.lastMessage}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${stMeta.cls}`}>
                        {language === 'bn' ? stMeta.labelBn : stMeta.labelEn}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER PANE: Conversation, Human-in-the-Loop Controls & AI Sales Copilot (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[820px]">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-white">Select an Omnichannel Conversation</h3>
              <p className="text-xs text-neutral-400 max-w-md">
                Pick a thread on the left or log a customer DM/Comment/Voice note to test Gemini Banglish AI, Review Mode approval, and 1-click order closing.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Top Bar */}
              <div className="p-3.5 border-b border-neutral-800 bg-[#151822] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl border ${CHANNEL_META[selectedConversation.channel].badgeBg}`}>
                      <ChannelBadgeIcon channel={selectedConversation.channel} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {selectedConversation.customerName}
                        </h3>
                        {selectedConversation.customerPhone && (
                          <a
                            href={`tel:${selectedConversation.customerPhone.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono shrink-0"
                            title="Quick Call Customer"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{selectedConversation.customerPhone}</span>
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-2">
                        <span>{CHANNEL_META[selectedConversation.channel].label}</span>
                        {selectedConversation.postTitleOrId && (
                          <span className="text-indigo-300">• Comment on: {selectedConversation.postTitleOrId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenProcessOrderModal(selectedConversation)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Process Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEscalationModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Escalate complaint/issue to Supervisor or Fulfillment Staff"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Escalate</span>
                    </button>

                    <select
                      value={selectedConversation.status}
                      onChange={(e) =>
                        updateConversationStatus(
                          selectedConversation.id,
                          e.target.value as CrmConversation['status']
                        )
                      }
                      className="px-2 py-1.5 rounded-lg bg-[#0C0E13] border border-neutral-700 text-[11px] text-neutral-200 focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="open">New Lead</option>
                      <option value="negotiating">Closing</option>
                      <option value="ready_to_order">Ready Order</option>
                      <option value="converted">Converted</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => deleteConversation(selectedConversation.id)}
                      className="p-1.5 rounded-lg bg-[#0C0E13] hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete Thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Human-in-the-Loop AI Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Hand-off Mode:</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['auto_pilot', 'review_mode', 'human_takeover'] as ConversationAiMode[]).map((mode) => {
                      const active = (selectedConversation.aiMode || 'auto_pilot') === mode;
                      const mMeta = AI_MODE_META[mode];
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            updateConversationAiMode(selectedConversation.id, mode);
                            addToast({
                              type: 'info',
                              titleEn: `AI Mode: ${mMeta.label}`,
                              titleBn: `মোড পরিবর্তন: ${mMeta.label}`,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                            active
                              ? `${mMeta.cls} font-semibold`
                              : 'bg-[#0C0E13] border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {mode === 'human_takeover' && <PauseCircle className="w-3 h-3" />}
                          <span>{mMeta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Escalation Alert Banner */}
              {selectedConversation.escalation?.isEscalated && (
                <div className="px-4 py-2.5 bg-rose-950/50 border-b border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-rose-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        Ticket {selectedConversation.escalation.ticketId} · Assigned to{' '}
                        {selectedConversation.escalation.assignedRole?.toUpperCase()} (
                        {selectedConversation.escalation.priority?.toUpperCase()})
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-300/90">{selectedConversation.escalation.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resolveEscalationTicket(selectedConversation.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Mark Ticket Resolved
                  </button>
                </div>
              )}

              {/* AI Auto-Extracted Order Intent Banner */}
              {selectedConversation.extractedOrderDraft?.hasOrderIntent &&
                !selectedConversation.extractedOrderDraft?.confirmedOrderId && (
                  <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-emerald-200 text-[11px] flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        AI Extracted Order: <strong>{selectedConversation.extractedOrderDraft.productName}</strong>{' '}
                        ({selectedConversation.extractedOrderDraft.district || 'BD'}) ·{' '}
                        <strong>
                          ৳{(selectedConversation.extractedOrderDraft.totalAmount || 0).toLocaleString()}
                        </strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenProcessOrderModal(selectedConversation)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold cursor-pointer"
                    >
                      Confirm & Create Order
                    </button>
                  </div>
                )}

              {/* Chat Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0D12]">
                {selectedConversation.messages.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  const matchedCards = (msg.matchedProductIds || [])
                    .map((id) => unifiedCatalog.find((p) => p.id === id))
                    .filter((p): p is Product => Boolean(p));

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 px-1">
                        {msg.sender === 'customer' ? (
                          <span>{selectedConversation.customerName}</span>
                        ) : msg.sender === 'ai_assistant' ? (
                          <span className="text-[#D4AF37] flex items-center gap-1 font-medium">
                            <Sparkles className="w-2.5 h-2.5" /> Luxora AI Closer
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <UserCheck className="w-2.5 h-2.5" /> Human Agent
                          </span>
                        )}
                        {msg.entryType === 'comment' && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                            Comment
                          </span>
                        )}
                        {msg.entryType === 'voice_note' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                            Voice Note
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap space-y-2 ${
                          isCustomer
                            ? 'bg-[#161923] border border-neutral-800 text-neutral-100 rounded-tl-sm'
                            : 'bg-gradient-to-br from-[#D4AF37]/20 to-[#1C1910] border border-[#D4AF37]/40 text-neutral-100 rounded-tr-sm'
                        }`}
                      >
                        {msg.postTitleOrId && (
                          <div className="text-[10px] text-indigo-300 border-b border-white/10 pb-1">
                            Post Context: {msg.postTitleOrId}
                          </div>
                        )}

                        {msg.imageUrl?.trim() && (
                          <div className="rounded-xl overflow-hidden border border-neutral-700/80 max-w-[240px]">
                            <img src={msg.imageUrl} alt="Customer upload" className="w-full max-h-48 object-cover" />
                          </div>
                        )}

                        {msg.audioDataUri?.trim() && (
                          <div className="space-y-1.5 p-2 rounded-xl bg-black/40 border border-neutral-700/70">
                            <audio controls src={msg.audioDataUri} className="w-56 h-8" />
                            {msg.audioTranscript && (
                              <div className="text-[11px] text-amber-200 italic">
                                Transcript (Gemini 3.5): "{msg.audioTranscript}"
                              </div>
                            )}
                          </div>
                        )}

                        {msg.text && <div>{msg.text}</div>}

                        {msg.deliveryQuote && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-[10px] text-sky-300">
                            <Truck className="w-3 h-3" />
                            <span>
                              {msg.deliveryQuote.district}:{' '}
                              {msg.deliveryQuote.charge === 0 ? 'FREE Shipping' : `৳${msg.deliveryQuote.charge}`}
                            </span>
                          </div>
                        )}

                        {matchedCards.length > 0 && (
                          <div className="pt-1.5 border-t border-white/10 flex flex-wrap gap-1.5">
                            {matchedCards.map((mp) => (
                              <span
                                key={mp.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-[#D4AF37]/30 text-[10px] text-[#D4AF37]"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {mp.nameEn} · ৳{mp.price.toLocaleString('en-IN')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* AI Review Mode Approval Card */}
              {selectedConversation.pendingAiDraft && (
                <div className="px-3.5 py-3 bg-amber-950/30 border-t border-amber-500/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-amber-300 font-semibold flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      AI Review Draft Awaiting Approval
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSendingMsg}
                        onClick={handleApprovePendingDraft}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold cursor-pointer"
                      >
                        Approve & Send Live
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyDraft(selectedConversation.pendingAiDraft?.text || '');
                          setReplyMode('admin');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#1A1D26] hover:bg-[#232735] border border-neutral-700 text-neutral-200 text-[11px] cursor-pointer"
                      >
                        Edit in Composer
                      </button>
                      <button
                        type="button"
                        onClick={() => savePendingAiDraft(selectedConversation.id, null)}
                        className="p-1 text-neutral-400 hover:text-rose-400 cursor-pointer"
                        title="Dismiss draft"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-200 bg-black/40 p-2.5 rounded-xl border border-amber-500/20 whitespace-pre-wrap">
                    {selectedConversation.pendingAiDraft.text}
                  </p>
                </div>
              )}

              {/* AI Sales Closer Control Strip & Composer */}
              <div className="p-3 border-t border-neutral-800 bg-[#141720] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('balanced')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-black text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>AI Auto-Analyze & Pitch</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('fixed_price_urgency')}
                      className="px-2 py-1.5 rounded-lg bg-[#1D212D] hover:bg-[#272C3C] border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Flame className="w-3 h-3" />
                      <span>Fixed Price</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('close_order')}
                      className="px-2 py-1.5 rounded-lg bg-[#1D212D] hover:bg-[#272C3C] border border-sky-500/30 text-sky-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3 h-3" />
                      <span>Close Order</span>
                    </button>
                  </div>

                  {/* Quick District Fee Estimator + Lang */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <select
                      value={estimatorDistrict}
                      onChange={(e) => setEstimatorDistrict(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-[#0C0E13] border border-neutral-700 text-sky-300"
                      title="Estimate delivery fee"
                    >
                      <option value="Dhaka">Dhaka (৳70)</option>
                      <option value="Chattogram">Ctg (৳100)</option>
                      <option value="Sylhet">Outside (৳120)</option>
                    </select>
                    <span className="text-[10px] font-mono text-emerald-300">
                      {activeDeliveryQuote.charge === 0 ? 'FREE' : `৳${activeDeliveryQuote.charge}`}
                    </span>
                    <select
                      value={preferredReplyLang}
                      onChange={(e) => setPreferredReplyLang(e.target.value as 'auto' | Language)}
                      className="px-2 py-1 rounded-lg bg-[#0C0E13] border border-neutral-700 text-neutral-200"
                    >
                      <option value="auto">Auto (BN/EN)</option>
                      <option value="bn">বাংলা</option>
                      <option value="en">EN</option>
                    </select>
                  </div>
                </div>

                {/* Copilot Insight Banner */}
                {copilotInsight && (
                  <div className="p-2.5 rounded-xl bg-[#0D1017] border border-[#D4AF37]/30 space-y-1 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[#D4AF37] font-semibold flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        Intent: {copilotInsight.customerIntent}
                      </span>
                      {copilotInsight.salesReplyAlternate && (
                        <button
                          type="button"
                          onClick={() => {
                            const alt = copilotInsight.salesReplyAlternate!;
                            setCopilotInsight({
                              ...copilotInsight,
                              salesReply: alt,
                              salesReplyAlternate: replyDraft,
                            });
                            setReplyDraft(alt);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#1D212D] hover:bg-[#282D3D] text-neutral-200 border border-neutral-700 cursor-pointer"
                        >
                          Switch to {copilotInsight.detectedLanguage === 'bn' ? 'English' : 'বাংলা'} Version
                        </button>
                      )}
                    </div>
                    {copilotInsight.visualAnalysis && (
                      <div className="text-sky-300 flex items-start gap-1.5">
                        <Camera className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Vision Match: {copilotInsight.visualAnalysis}</span>
                      </div>
                    )}
                    {copilotInsight.voiceTranscript && (
                      <div className="text-amber-200 flex items-start gap-1.5">
                        <FileAudio className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Voice Transcript: {copilotInsight.voiceTranscript}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Reply / Voice / Screenshot Form */}
                <form onSubmit={handleSendComposerMessage} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReplyMode('admin')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          replyMode === 'admin'
                            ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-semibold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Send as Agent
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMode('customer')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          replyMode === 'customer'
                            ? 'bg-sky-500/20 text-sky-300 font-semibold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Simulate Customer + AI
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleToggleVoiceRecording}
                        className={`flex items-center gap-1 cursor-pointer ${
                          isRecordingVoice ? 'text-rose-400 animate-pulse font-semibold' : 'text-neutral-300 hover:text-[#D4AF37]'
                        }`}
                      >
                        {isRecordingVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isRecordingVoice ? 'Stop Rec' : 'Voice Mic'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isTranscribingAudio}
                        onClick={() => composerAudioInputRef.current?.click()}
                        className="text-neutral-300 hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
                      >
                        {isTranscribingAudio ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileAudio className="w-3.5 h-3.5" />
                        )}
                        <span>Audio Clip</span>
                      </button>
                      <input
                        ref={composerAudioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleComposerAudioUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => composerFileInputRef.current?.click()}
                        className="text-neutral-300 hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>Photo</span>
                      </button>
                      <input
                        ref={composerFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleComposerImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {(composerImageDataUri?.trim() || composerAudioDataUri?.trim()) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {composerImageDataUri?.trim() && (
                        <div className="relative inline-block">
                          <img
                            src={composerImageDataUri}
                            alt="Attachment preview"
                            className="h-14 w-14 rounded-lg object-cover border border-[#D4AF37]/40"
                          />
                          <button
                            type="button"
                            onClick={() => setComposerImageDataUri(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {composerAudioDataUri?.trim() && (
                        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/50 border border-amber-500/30">
                          <audio controls src={composerAudioDataUri} className="h-7 w-44" />
                          <button
                            type="button"
                            onClick={() => setComposerAudioDataUri(null)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <textarea
                      rows={3}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={
                        replyMode === 'customer'
                          ? 'Simulate customer follow-up or voice transcript...'
                          : 'Click "AI Auto-Analyze & Pitch" or type your reply...'
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0B0D12] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]/60 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingMsg || (!replyDraft.trim() && !composerImageDataUri && !composerAudioDataUri)}
                      className="px-4 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{replyMode === 'customer' ? 'Run Test' : 'Send'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANE: Smart Product Matcher & Customer 360° Panel (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[820px]">
          {/* Switcher Tabs */}
          <div className="p-2.5 border-b border-neutral-800 grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setRightRailTab('catalog')}
              className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                rightRailTab === 'catalog'
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0C0E13] text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Catalog ({unifiedCatalog.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRightRailTab('customer')}
              className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                rightRailTab === 'customer'
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#0C0E13] text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Customer 360 ({customerPastOrders.length})</span>
            </button>
          </div>

          {rightRailTab === 'catalog' ? (
            <>
              <div className="p-3 border-b border-neutral-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    placeholder='Fuzzy search e.g. "b72", "lamp"...'
                    className="w-full pl-8 pr-7 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                  {catalogSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {activeMatchedProducts.length > 0 && !catalogSearchQuery.trim() && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#D4AF37]">
                      Matched to Query / Screenshot
                    </div>
                    {activeMatchedProducts.map((prod) => (
                      <ProductMatchCard
                        key={`ai-${prod.id}`}
                        product={prod}
                        highlight
                        onInject={() => handleInjectProductIntoReply(prod)}
                        onCopyLink={() => handleCopyProductLink(prod)}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                    {catalogSearchQuery.trim() ? 'Fuzzy Catalog Matches' : 'Available Stock'}
                  </div>
                  {fuzzySearchResults.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#0C0E13] border border-neutral-800 text-center text-xs text-neutral-400">
                      No catalog items matched "{catalogSearchQuery}".
                    </div>
                  ) : (
                    fuzzySearchResults.map((prod) => (
                      <ProductMatchCard
                        key={prod.id}
                        product={prod}
                        onInject={() => handleInjectProductIntoReply(prod)}
                        onCopyLink={() => handleCopyProductLink(prod)}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
              {!selectedConversation ? (
                <div className="text-center text-neutral-500 py-10">Select a conversation first.</div>
              ) : (
                <>
                  {/* Customer Profile Card */}
                  <div className="p-3.5 rounded-xl bg-[#0C0E13] border border-neutral-800 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{selectedConversation.customerName}</h4>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {selectedConversation.customerHandle || selectedConversation.customerId}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${CHANNEL_META[selectedConversation.channel].badgeBg}`}>
                        {CHANNEL_META[selectedConversation.channel].short}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedConversation.customerPhone && (
                        <a
                          href={`tel:${selectedConversation.customerPhone.replace(/\s+/g, '')}`}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> Call Now
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const txt = selectedConversation.customerPhone || selectedConversation.customerHandle || selectedConversation.customerId;
                          navigator.clipboard?.writeText(txt);
                          addToast({ type: 'info', titleEn: 'Contact Copied', titleBn: 'কন্টাক্ট কপি হয়েছে', descriptionEn: txt });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#161923] hover:bg-[#1E2230] border border-neutral-800 text-neutral-300 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-[#D4AF37]" /> Copy ID
                      </button>
                    </div>
                  </div>

                  {/* Past Orders History */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                      <span>Past Store Orders ({customerPastOrders.length})</span>
                      <Package className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </div>

                    {customerPastOrders.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#0C0E13] border border-neutral-800 text-center text-neutral-400 space-y-2">
                        <p>No prior orders matched for this phone or customer name.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenProcessOrderModal(selectedConversation)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer"
                        >
                          + Create First Order
                        </button>
                      </div>
                    ) : (
                      customerPastOrders.map((ord) => (
                        <div key={ord.id} className="p-3 rounded-xl bg-[#0C0E13] border border-neutral-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#D4AF37]">{ord.id}</span>
                            <span className="px-2 py-0.5 rounded bg-[#1A1D26] text-[10px] text-neutral-200">
                              {ord.orderStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-300">
                            {ord.items?.[0]?.nameEn} ({ord.items?.length} item)
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-white">৳{ord.totalAmount.toLocaleString()}</span>
                            <span className="text-neutral-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                          </div>
                          {ord.trackingInfo?.consignmentId && (
                            <div className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                              {ord.trackingInfo.courier}: {ord.trackingInfo.consignmentId}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setInvoiceOrder(ord)}
                              className="px-2 py-1 rounded-lg bg-[#1A1D26] hover:bg-[#242836] border border-neutral-700 text-neutral-200 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3 text-[#D4AF37]" /> Invoice
                            </button>
                            <button
                              type="button"
                              disabled={bookingOrderId === ord.id}
                              onClick={() => handleOneClickBookCourier(ord, 'steadfast')}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold cursor-pointer"
                            >
                              {bookingOrderId === ord.id ? '...' : 'Steadfast'}
                            </button>
                            <button
                              type="button"
                              disabled={bookingOrderId === ord.id}
                              onClick={() => handleOneClickBookCourier(ord, 'pathao')}
                              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[10px] font-semibold cursor-pointer"
                            >
                              Pathao
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Log / Simulate Incoming Social DM / Post Comment / Voice Note */}
      {isNewDmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Log Customer DM, Post Comment or Voice Note
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Simulate Messenger, WhatsApp, Instagram, TikTok or Web Chat inquiries with voice or screenshot matching.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDmModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInboundDm} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1.5">Channel</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(['messenger', 'whatsapp', 'instagram', 'tiktok', 'web'] as SocialChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setNewDmChannel(ch)}
                      className={`px-2 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer ${
                        newDmChannel === ch
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                          : 'bg-[#0C0E13] text-neutral-300 border-neutral-800'
                      }`}
                    >
                      <ChannelBadgeIcon channel={ch} className="w-3 h-3" />
                      <span>{CHANNEL_META[ch].short}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Entry Type</label>
                  <select
                    value={newDmEntryType}
                    onChange={(e) => setNewDmEntryType(e.target.value as CrmEntryType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  >
                    <option value="dm">Direct Message (DM)</option>
                    <option value="comment">Post / Reel Comment</option>
                    <option value="web_chat">Website Live Chat</option>
                    <option value="voice_note">Voice Note Message</option>
                  </select>
                </div>
                {newDmEntryType === 'comment' && (
                  <div>
                    <label className="text-neutral-400 block mb-1">Post / Reel Title</label>
                    <input
                      type="text"
                      value={newDmPostTitle}
                      onChange={(e) => setNewDmPostTitle(e.target.value)}
                      placeholder="e.g. FB Reel #42 Smartwatch"
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newDmName}
                    onChange={(e) => setNewDmName(e.target.value)}
                    placeholder="e.g. Rashedul Islam"
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Phone or Handle</label>
                  <input
                    type="text"
                    value={newDmHandle}
                    onChange={(e) => setNewDmHandle(e.target.value)}
                    placeholder="017XXXXXXXX or @user"
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Message Text (EN / BN / Banglish)</label>
                <textarea
                  rows={3}
                  value={newDmText}
                  onChange={(e) => setNewDmText(e.target.value)}
                  placeholder='e.g. "b72 er price koto bhai? Dhaka te delivery charge koto?"'
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => newDmFileInputRef.current?.click()}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{newDmImageUri ? 'Screenshot Attached' : 'Upload Screenshot'}</span>
                </button>
                <input
                  ref={newDmFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewDmImageUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => newDmAudioInputRef.current?.click()}
                  className="text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileAudio className="w-3.5 h-3.5" />
                  <span>{newDmAudioUri ? 'Voice Clip Attached' : 'Attach Voice Clip'}</span>
                </button>
                <input
                  ref={newDmAudioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleNewDmAudioUpload}
                  className="hidden"
                />
              </div>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDmAutoCopilot}
                  onChange={(e) => setNewDmAutoCopilot(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                <span>Immediately transcribe & draft AI Sales reply</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewDmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDm || (!newDmText.trim() && !newDmImageUri && !newDmAudioUri)}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingDm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Analyze</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Escalate Complaint / Issue Ticket */}
      {isEscalationModalOpen && selectedConversation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#12141A] border border-rose-500/40 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Escalate Conversation to Ticket</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEscalationModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEscalateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Route To Role</label>
                  <select
                    value={escRole}
                    onChange={(e) => setEscRole(e.target.value as 'supervisor' | 'staff')}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  >
                    <option value="supervisor">Store Supervisor / Admin</option>
                    <option value="staff">Fulfillment Staff</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Priority</label>
                  <select
                    value={escPriority}
                    onChange={(e) => setEscPriority(e.target.value as 'normal' | 'high' | 'urgent')}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / SLA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Escalation Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={escReason}
                  onChange={(e) => setEscReason(e.target.value)}
                  placeholder="e.g. Damaged charger claimed on arrival — needs replacement check."
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                />
              </div>

              <p className="text-[11px] text-amber-300/90">
                Escalating automatically switches this chat to Human Takeover so AI stops auto-replying.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsEscalationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEscalating}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold cursor-pointer"
                >
                  {isEscalating ? 'Creating Ticket...' : 'Create Ticket & Pause AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Channel Config Modal */}
      {isAdmin && isChannelSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Omnichannel Webhook & Channel Quick Config</h3>
                <p className="text-[11px] text-neutral-400">
                  Manage Messenger, WhatsApp, Instagram, TikTok & Website Live Chat endpoints.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChannelSettingsOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400 font-medium">Callback Webhook URL:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookEndpointUrl);
                    addToast({ type: 'info', titleEn: 'Webhook URL Copied', titleBn: 'ওয়েবহুক লিংক কপি হয়েছে' });
                  }}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="font-mono text-[11px] text-emerald-300 bg-black/50 px-2.5 py-1.5 rounded-lg break-all border border-neutral-800">
                {webhookEndpointUrl}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto">
              {editingChannels.map((cfg, idx) => {
                const meta = CHANNEL_META[cfg.id];
                return (
                  <div key={cfg.id} className="p-3.5 rounded-xl bg-[#161822] border border-neutral-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold flex items-center gap-1.5 ${meta.color}`}>
                        <ChannelBadgeIcon channel={cfg.id} />
                        {meta.label}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.connected}
                          onChange={(e) => {
                            const next = [...editingChannels];
                            next[idx] = { ...cfg, connected: e.target.checked };
                            setEditingChannels(next);
                          }}
                          className="accent-[#D4AF37]"
                        />
                        Active
                      </label>
                    </div>

                    <input
                      type="text"
                      value={cfg.handleOrNumber}
                      onChange={(e) => {
                        const next = [...editingChannels];
                        next[idx] = { ...cfg, handleOrNumber: e.target.value };
                        setEditingChannels(next);
                      }}
                      placeholder="Handle or WhatsApp Number"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0C0E13] border border-neutral-800 text-white text-[11px]"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setIsChannelSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSavingChannels}
                onClick={handleSaveChannelConfigs}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingChannels && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Channel Config</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Process Order Directly From Chat */}
      {isOrderModalOpen && selectedConversation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#12141A] border border-emerald-500/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>Confirm & Create Store Order from Chat</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Syncs directly to Admin Orders & tags source channel ({CHANNEL_META[selectedConversation.channel].short}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const prod = unifiedCatalog.find((p) => p.id === orderProductId);
                if (!prod || !orderCustomerName.trim() || !orderCustomerPhone.trim() || !orderAddress.trim()) {
                  addToast({
                    type: 'warning',
                    titleEn: 'Complete Order Details',
                    titleBn: 'অর্ডারের তথ্য পূরণ করুন',
                    descriptionEn: 'Select a product and fill customer name, phone, and address.',
                  });
                  return;
                }

                setIsCreatingOrder(true);
                try {
                  const qty = Math.max(1, Number(orderQty) || 1);
                  const subtotal = prod.price * qty;
                  const quote = calculateDeliveryCharge(
                    orderDistrict,
                    subtotal,
                    Boolean(prod.freeDelivery)
                  );
                  const totalAmount = subtotal + quote.charge;
                  const sourceChannel: OrderSourceChannel = selectedConversation.channel;

                  const created = await orderService.createOrder({
                    userId: user?.id || 'guest',
                    sourceChannel,
                    customer: {
                      name: orderCustomerName.trim(),
                      phone: orderCustomerPhone.trim(),
                      district: quote.district,
                      shippingAddress: orderAddress.trim(),
                      notes: `${orderNotes} | Processed by ${isSuperAdmin ? 'Super Admin' : 'Admin'} (${user?.email || 'agent'})`,
                    },
                    items: [
                      {
                        productId: prod.id,
                        nameEn: prod.nameEn,
                        nameBn: prod.nameBn,
                        image: prod.image,
                        price: prod.price,
                        quantity: qty,
                        sku: prod.sku,
                      },
                    ],
                    subtotal,
                    deliveryCharge: quote.charge,
                    discount: 0,
                    totalAmount,
                    paymentMethod: 'cod',
                    paymentOption: 'cod',
                    paymentStatus: 'pending',
                    orderStatus: 'Confirmed',
                  });

                  setAllOrders((prev) => [created, ...prev]);
                  await updateConversationStatus(selectedConversation.id, 'converted');
                  if (selectedConversation.extractedOrderDraft) {
                    await saveExtractedOrderDraft(selectedConversation.id, {
                      ...selectedConversation.extractedOrderDraft,
                      confirmedOrderId: created.id,
                    });
                  }

                  setReplyDraft(
                    `ধন্যবাদ ${orderCustomerName.trim()}! আপনার ${prod.nameEn} (${qty}টি) অর্ডারটি কনফার্ম হয়েছে।\nঅর্ডার আইডি: ${created.id}\nমোট: ৳${totalAmount.toLocaleString('en-IN')} (${quote.charge === 0 ? 'ফ্রি ডেলিভারি' : `ডেলিভারি চার্জ ৳${quote.charge} সহ`}, ক্যাশ অন ডেলিভারি)।`
                  );
                  setIsOrderModalOpen(false);
                  setInvoiceOrder(created);
                  addToast({
                    type: 'success',
                    titleEn: `Order ${created.id} Created`,
                    titleBn: `অর্ডার ${created.id} তৈরি হয়েছে`,
                    descriptionEn: 'Invoice ready & confirmation drafted in chat.',
                  });
                } catch (err: any) {
                  addToast({
                    type: 'error',
                    titleEn: 'Order Creation Failed',
                    titleBn: 'অর্ডার তৈরি ব্যর্থ হয়েছে',
                    descriptionEn: err?.message || 'Could not process order.',
                  });
                } finally {
                  setIsCreatingOrder(false);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-neutral-400 block mb-1">Product *</label>
                <select
                  value={orderProductId}
                  onChange={(e) => setOrderProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  {unifiedCatalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn} — ৳{p.price.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={orderCustomerName}
                    onChange={(e) => setOrderCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={orderCustomerPhone}
                    onChange={(e) => setOrderCustomerPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">District</label>
                  <input
                    type="text"
                    value={orderDistrict}
                    onChange={(e) => setOrderDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[11px] text-emerald-300 font-semibold px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    Delivery:{' '}
                    {(() => {
                      const prod = unifiedCatalog.find((p) => p.id === orderProductId);
                      const q = calculateDeliveryCharge(
                        orderDistrict,
                        (prod?.price || 0) * Math.max(1, orderQty),
                        Boolean(prod?.freeDelivery)
                      );
                      return q.charge === 0 ? 'FREE' : `৳${q.charge}`;
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Full Delivery Address *</label>
                <textarea
                  rows={2}
                  required
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                  placeholder="House, Road, Area, Thana..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Order & View Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {invoiceOrder && (
        <PrintableInvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  );
};

interface ProductMatchCardProps {
  product: Product;
  highlight?: boolean;
  onInject: () => void;
  onCopyLink: () => void;
}

const ProductMatchCard: React.FC<ProductMatchCardProps> = ({
  product,
  highlight = false,
  onInject,
  onCopyLink,
}) => {
  const stockCount = product.stockCount ?? 0;
  const available = product.inStock && stockCount > 0;

  return (
    <div
      className={`p-2.5 rounded-xl border transition-all space-y-2 ${
        highlight ? 'bg-[#191610] border-[#D4AF37]/40' : 'bg-[#0C0E13] border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {product.image?.trim() ? (
          <img
            src={product.image}
            alt={product.nameEn}
            className="w-11 h-11 rounded-lg object-cover border border-neutral-800 shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white line-clamp-1">{product.nameEn}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono font-bold text-[#D4AF37]">
              ৳{product.price.toLocaleString('en-IN')}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] font-mono text-neutral-500 line-through">
                ৳{product.originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div className="mt-1">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                available
                  ? stockCount <= 8
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {available ? `Stock: ${stockCount} pcs` : 'Stock Out'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onInject}
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-semibold cursor-pointer transition-all"
        >
          + Insert Pitch & Link
        </button>
        <button
          type="button"
          onClick={onCopyLink}
          className="p-1.5 rounded-lg bg-[#161822] hover:bg-[#1F2230] border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
          title="Copy Product Share URL"
        >
          <LinkIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
