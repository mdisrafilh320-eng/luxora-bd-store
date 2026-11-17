import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  ImagePlus,
  Instagram,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { orderService } from '../../services/orderService';
import {
  ChannelConnectionConfig,
  CrmConversation,
  Language,
  Product,
  SalesCopilotResult,
  SocialChannel,
} from '../../types';
import {
  appendMessageToConversation,
  compressChatImageFile,
  createInboundConversation,
  DEFAULT_CHANNEL_CONFIGS,
  deleteConversation,
  dispatchLiveChannelReply,
  ensureDefaultChannelConfigs,
  fuzzyMatchProductsClient,
  markConversationRead,
  requestAiSalesCopilot,
  saveChannelConfig,
  seedSampleOmnichannelConversations,
  subscribeToChannelConfigs,
  subscribeToCrmConversations,
  syncChannelConfigsToServer,
  syncPendingWebhookEvents,
  updateConversationStatus,
} from '../../services/omnichannelCrmService';
import { getProductShareUrl } from '../../services/shareService';

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
  }
}

export const OmnichannelSalesInboxTab: React.FC = () => {
  const { isAdmin, isSuperAdmin, user, language, products, addToast } = useApp();

  if (!isAdmin) {
    return null;
  }

  const [conversations, setConversations] = useState<CrmConversation[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConnectionConfig[]>(DEFAULT_CHANNEL_CONFIGS);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<'all' | SocialChannel>('all');
  const [threadSearch, setThreadSearch] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Reply Composer & AI Sales Copilot State
  const [replyDraft, setReplyDraft] = useState('');
  const [replyMode, setReplyMode] = useState<'customer' | 'admin'>('admin');
  const [preferredReplyLang, setPreferredReplyLang] = useState<'auto' | Language>('auto');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [copilotInsight, setCopilotInsight] = useState<SalesCopilotResult | null>(null);
  const [composerImageDataUri, setComposerImageDataUri] = useState<string | null>(null);

  // Smart Fuzzy Catalog Search (Right Rail)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Modals: New/Test DM & Webhook Channels Setup (Webhooks Super Admin only)
  const [isNewDmModalOpen, setIsNewDmModalOpen] = useState(false);
  const [newDmChannel, setNewDmChannel] = useState<SocialChannel>('messenger');
  const [newDmName, setNewDmName] = useState('');
  const [newDmHandle, setNewDmHandle] = useState('');
  const [newDmText, setNewDmText] = useState('');
  const [newDmImageUri, setNewDmImageUri] = useState<string | null>(null);
  const [newDmAutoCopilot, setNewDmAutoCopilot] = useState(true);
  const [isCreatingDm, setIsCreatingDm] = useState(false);

  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false);
  const [editingChannels, setEditingChannels] = useState<ChannelConnectionConfig[]>(DEFAULT_CHANNEL_CONFIGS);
  const [isSavingChannels, setIsSavingChannels] = useState(false);

  // Inline Order Processing Modal (Allows Sales Agents, Supervisors & Admins to close sales & process orders inside Inbox)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderProductId, setOrderProductId] = useState('');
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderDistrict, setOrderDistrict] = useState('Dhaka');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const composerFileInputRef = useRef<HTMLInputElement | null>(null);
  const newDmFileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to real-time CRM conversations & Channel configs
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

    return () => {
      unsubConvs();
      unsubChannels();
    };
  }, [isAdmin]);

  // Periodically drain any incoming Meta/WhatsApp/IG/TikTok webhook payloads while Inbox is active
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      const count = await syncPendingWebhookEvents(conversations, products);
      if (count > 0 && active) {
        addToast({
          type: 'info',
          titleEn: `${count} New Social DM Received`,
          titleBn: `${count}টি নতুন সোশ্যাল মেসেজ এসেছে`,
          descriptionEn: 'Synced from omnichannel webhook into AI Sales Inbox.',
        });
      }
    };
    const timer = setInterval(poll, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isAdmin, conversations, products, addToast]);

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

  const filteredConversations = useMemo(() => {
    const q = threadSearch.toLowerCase().trim();
    return conversations.filter((conv) => {
      const matchesChannel = channelFilter === 'all' || conv.channel === channelFilter;
      const matchesQuery =
        !q ||
        conv.customerName.toLowerCase().includes(q) ||
        (conv.customerHandle || '').toLowerCase().includes(q) ||
        (conv.customerPhone || '').toLowerCase().includes(q) ||
        conv.lastMessage.toLowerCase().includes(q);
      return matchesChannel && matchesQuery;
    });
  }, [conversations, channelFilter, threadSearch]);

  const unreadByChannel = useMemo(() => {
    const counts: Record<'all' | SocialChannel, number> = {
      all: 0,
      messenger: 0,
      whatsapp: 0,
      instagram: 0,
      tiktok: 0,
    };
    for (const c of conversations) {
      const u = c.unreadCount || 0;
      counts.all += u;
      counts[c.channel] = (counts[c.channel] || 0) + u;
    }
    return counts;
  }, [conversations]);

  // Matched products for active thread + live fuzzy catalog search in right rail
  const activeMatchedProducts = useMemo(() => {
    const idMap = new Map<string, Product>();
    if (copilotInsight?.matchedProducts) {
      for (const p of copilotInsight.matchedProducts) idMap.set(p.id, p);
    }
    if (selectedConversation?.matchedProductIds) {
      for (const id of selectedConversation.matchedProductIds) {
        const found = products.find((p) => p.id === id);
        if (found) idMap.set(found.id, found);
      }
    }
    if (selectedConversation && idMap.size === 0) {
      const lastCust = [...(selectedConversation.messages || [])]
        .reverse()
        .find((m) => m.sender === 'customer');
      if (lastCust?.text) {
        for (const p of fuzzyMatchProductsClient(lastCust.text, products, 3)) {
          idMap.set(p.id, p);
        }
      }
    }
    return Array.from(idMap.values());
  }, [copilotInsight, selectedConversation, products]);

  const fuzzySearchResults = useMemo(() => {
    if (!catalogSearchQuery.trim()) {
      return products.filter((p) => p.inStock && (p.stockCount ?? 1) > 0).slice(0, 6);
    }
    return fuzzyMatchProductsClient(catalogSearchQuery, products, 8);
  }, [catalogSearchQuery, products]);

  const handleRunSalesCopilot = async (
    tactic: 'balanced' | 'fixed_price_urgency' | 'handle_objection' | 'close_order' = 'balanced',
    targetConv?: CrmConversation,
    overrideMsg?: string,
    overrideImage?: string
  ) => {
    const conv = targetConv || selectedConversation;
    if (!conv) return;

    const latestCustomerMsg = [...(conv.messages || [])]
      .reverse()
      .find((m) => m.sender === 'customer');
    const queryText = overrideMsg ?? latestCustomerMsg?.text ?? conv.lastMessage ?? '';
    const imageToInspect = overrideImage ?? latestCustomerMsg?.imageUrl;

    setIsGeneratingAi(true);
    try {
      const result = await requestAiSalesCopilot({
        customerMessage: queryText,
        conversationHistory: conv.messages,
        imageDataUri: imageToInspect?.startsWith('data:image/') ? imageToInspect : undefined,
        imageUrl: imageToInspect && !imageToInspect.startsWith('data:image/') ? imageToInspect : undefined,
        preferredLanguage: preferredReplyLang,
        tacticOverride: tactic,
        catalog: products,
      });

      setCopilotInsight(result);
      setReplyDraft(result.salesReply);
      setReplyMode('admin');

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
    if (!text && !composerImageDataUri) return;

    setIsSendingMsg(true);
    try {
      const matchedIds = activeMatchedProducts.map((p) => p.id);
      const updated = await appendMessageToConversation(
        selectedConversation,
        {
          sender: replyMode === 'customer' ? 'customer' : copilotInsight ? 'ai_assistant' : 'admin',
          text: text || (composerImageDataUri ? 'Sent a product screenshot' : ''),
          imageUrl: composerImageDataUri || undefined,
          matchedProductIds: matchedIds,
          visualAnalysis: copilotInsight?.visualAnalysis,
          urgencyAngle: copilotInsight?.urgencyAngle,
        },
        {
          matchedProductIds: matchedIds,
          detectedLanguage: copilotInsight?.detectedLanguage || selectedConversation.detectedLanguage,
          unreadCount: replyMode === 'customer' ? 1 : 0,
        }
      );

      // Copy outgoing sales reply to clipboard for instant 1-paste into Meta/WhatsApp if needed
      if (replyMode === 'admin' && text && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }

      setReplyDraft('');
      setComposerImageDataUri(null);

      // If admin simulated a customer follow-up, automatically run AI Vision/Sales Copilot
      if (replyMode === 'customer') {
        setReplyMode('admin');
        await handleRunSalesCopilot('balanced', updated, text, composerImageDataUri || undefined);
      } else {
        // Attempt live Meta / WhatsApp / Instagram / TikTok outbound delivery if channel token is configured
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
          titleEn: liveRes?.dispatchedLive ? 'Reply Sent Live & Saved' : 'Reply Logged & Copied',
          titleBn: liveRes?.dispatchedLive ? 'রিপ্লাই সরাসরি পাঠানো হয়েছে' : 'রিপ্লাই পাঠানো ও কপি হয়েছে',
          descriptionEn: liveRes?.dispatchedLive
            ? liveRes.detail
            : 'Saved to CRM thread & copied to clipboard for instant DM paste.',
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

  const handleCreateInboundDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDmText.trim() && !newDmImageUri) return;

    setIsCreatingDm(true);
    try {
      const fuzzyIds = fuzzyMatchProductsClient(newDmText, products, 3).map((p) => p.id);
      const created = await createInboundConversation({
        channel: newDmChannel,
        customerName: newDmName.trim() || `${CHANNEL_META[newDmChannel].short} Shopper`,
        customerHandle: newDmHandle.trim() || undefined,
        text: newDmText.trim() || 'Sent a product screenshot',
        imageUrl: newDmImageUri || undefined,
        matchedProductIds: fuzzyIds,
      });

      setSelectedConvId(created.id);
      setIsNewDmModalOpen(false);
      setNewDmName('');
      setNewDmHandle('');
      setNewDmText('');
      setNewDmImageUri(null);

      if (newDmAutoCopilot) {
        await handleRunSalesCopilot('balanced', created, created.messages[0].text, created.messages[0].imageUrl);
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

  const handleInjectProductIntoReply = (prod: Product) => {
    const url = getProductShareUrl(prod.id);
    const priceFmt = `৳${prod.price.toLocaleString('en-IN')}`;
    const stockNote =
      prod.inStock && (prod.stockCount ?? 10) <= 8
        ? language === 'bn'
          ? `মাত্র ${prod.stockCount} পিস বাকি!`
          : `Only ${prod.stockCount} left in stock!`
        : language === 'bn'
          ? 'স্টকে আছে (সীমিত ব্যাচ)'
          : 'In stock (Limited batch)';

    const snippet =
      copilotInsight?.detectedLanguage === 'bn' || selectedConversation?.detectedLanguage === 'bn'
        ? `\n\n✨ ${prod.nameEn} — ফিক্সড প্রমোশনাল প্রাইস: ${priceFmt} (${stockNote})\n🔗 দেখুন ও অর্ডার করুন: ${url}`
        : `\n\n✨ ${prod.nameEn} — Fixed Promotional Price: ${priceFmt} (${stockNote})\n🔗 View & Order: ${url}`;

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
      const count = await seedSampleOmnichannelConversations(products);
      addToast({
        type: 'success',
        titleEn: `Loaded ${count} Omnichannel Threads`,
        titleBn: `${count}টি স্যাম্পল চ্যাট লোড হয়েছে`,
        descriptionEn: 'Messenger, WhatsApp, Instagram & TikTok inquiries are ready for AI testing.',
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

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Admin-Only Command Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#151822] to-[#12141A] border border-[#D4AF37]/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40">
              <ShieldCheck className="w-3 h-3" />
              {language === 'bn' ? 'অ্যাডমিন-অনলি এআই সেলস ক্রু' : 'Admin-Only AI Sales CRM'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3" />
              Gemini Vision + Bilingual Closer
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-display font-semibold text-white">
            {language === 'bn'
              ? 'অমনিচ্যানেল এআই সেলস অ্যাসিস্ট্যান্ট ও মেসেজিং ইনবক্স'
              : 'Omnichannel AI Sales Assistant & Social DM Inbox'}
          </h2>
          <p className="text-xs text-neutral-400">
            {language === 'bn'
              ? 'Messenger, WhatsApp, Instagram ও TikTok-এর মেসেজ ও প্রোডাক্টের ছবি বিশ্লেষণ করে ফিক্সড-প্রাইস আর্জেন্সি রিপ্লাই তৈরি করুন।'
              : 'Unify Facebook Messenger, WhatsApp, Instagram & TikTok DMs with photo matching, fuzzy SKU lookup & persuasive fixed-price closing.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsChannelSettingsOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#1A1D26] hover:bg-[#232734] border border-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{language === 'bn' ? 'চ্যানেল ও ওয়েবহুক' : 'Channel Webhooks'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNewDmModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন ইনকামিং DM / ছবি টেস্ট' : 'Log DM / Test Photo'}</span>
          </button>
        </div>
      </div>

      {/* Omnichannel Platform Filter Bar */}
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
          <span>{language === 'bn' ? 'সকল চ্যানেল' : 'All Channels'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25">
            {conversations.length}
          </span>
        </button>

        {(['messenger', 'whatsapp', 'instagram', 'tiktok'] as SocialChannel[]).map((ch) => {
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
              {cfg?.connected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Connected" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main 3-Pane CRM Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[650px]">
        {/* LEFT PANE: Thread Queue (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[760px]">
          <div className="p-3 border-b border-neutral-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                placeholder={language === 'bn' ? 'কাস্টমার বা মেসেজ খুঁজুন...' : 'Search customer or text...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/70">
            {isLoadingInbox ? (
              <div className="py-16 flex flex-col items-center justify-center text-neutral-400 gap-2 text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
                <span>Loading omnichannel inbox...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-5 text-center space-y-3 my-8">
                <Bot className="w-8 h-8 text-[#D4AF37] mx-auto opacity-80" />
                <div className="text-xs font-semibold text-white">
                  {language === 'bn' ? 'কোনো কনভারসেশন নেই' : 'No Conversations Yet'}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {language === 'bn'
                    ? 'Messenger, WhatsApp, Instagram বা TikTok টেস্ট ইনকোয়ারি লোড করুন অথবা নতুন মেসেজ যোগ করুন।'
                    : 'Load sample Messenger, WhatsApp, Instagram & TikTok inquiries or log a custom customer DM/photo.'}
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSeeding}
                    onClick={handleSeedDemoInbox}
                    className="px-3 py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSeeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Load 4 Channel Samples</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewDmModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-[#1A1D26] hover:bg-[#242834] border border-neutral-700 text-neutral-200 text-xs font-medium cursor-pointer"
                  >
                    + Log Custom DM / Photo
                  </button>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const chMeta = CHANNEL_META[conv.channel];
                const stMeta = STATUS_META[conv.status];

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#191C26] border-l-2 border-l-[#D4AF37]'
                        : 'hover:bg-[#161822]'
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

        {/* CENTER PANE: Conversation & AI Sales Copilot (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[760px]">
          {!selectedConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-white">Select or Log an Omnichannel Conversation</h3>
              <p className="text-xs text-neutral-400 max-w-md">
                Pick a thread on the left or upload a customer photo/DM to test Gemini Vision matching and Luxora BD psychological sales closing.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Top Bar */}
              <div className="p-3.5 border-b border-neutral-800 bg-[#151822] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border ${CHANNEL_META[selectedConversation.channel].badgeBg}`}>
                    <ChannelBadgeIcon channel={selectedConversation.channel} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {selectedConversation.customerName}
                      </h3>
                      <span className="text-[10px] text-neutral-400 font-mono truncate">
                        {selectedConversation.customerPhone || selectedConversation.customerHandle || ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {CHANNEL_META[selectedConversation.channel].label}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const defaultProd = activeMatchedProducts[0] || products[0];
                      setOrderProductId(defaultProd?.id || '');
                      setOrderCustomerName(selectedConversation.customerName || '');
                      setOrderCustomerPhone(selectedConversation.customerPhone || '');
                      setOrderAddress('');
                      setOrderQty(1);
                      setOrderNotes(`Converted from ${CHANNEL_META[selectedConversation.channel].label} (${selectedConversation.id})`);
                      setIsOrderModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Process order directly for this chat customer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'অর্ডার প্রসেস' : 'Process Order'}</span>
                  </button>

                  <select
                    value={selectedConversation.status}
                    onChange={(e) =>
                      updateConversationStatus(
                        selectedConversation.id,
                        e.target.value as CrmConversation['status']
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-[#0C0E13] border border-neutral-700 text-xs text-neutral-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="open">New Lead</option>
                    <option value="negotiating">Closing / Pitching</option>
                    <option value="ready_to_order">Ready to Order</option>
                    <option value="converted">Converted Sale</option>
                    <option value="resolved">Closed / Resolved</option>
                  </select>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => deleteConversation(selectedConversation.id)}
                      className="p-1.5 rounded-lg bg-[#0C0E13] hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-500/40 text-neutral-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete Thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0D12]">
                {selectedConversation.messages.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  const matchedCards = (msg.matchedProductIds || [])
                    .map((id) => products.find((p) => p.id === id))
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
                            <UserCheck className="w-2.5 h-2.5" /> Admin
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
                        {msg.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-neutral-700/80 max-w-[240px]">
                            <img
                              src={msg.imageUrl}
                              alt="Customer upload"
                              className="w-full max-h-48 object-cover"
                            />
                          </div>
                        )}
                        {msg.text && <div>{msg.text}</div>}

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

              {/* AI Sales Closer Control Strip */}
              <div className="p-3 border-t border-neutral-800 bg-[#141720] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('balanced')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-black text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingAi ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>AI Auto-Analyze & Pitch</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('fixed_price_urgency')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1D212D] hover:bg-[#272C3C] border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Flame className="w-3 h-3" />
                      <span>Fixed Price + Urgency</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('handle_objection')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1D212D] hover:bg-[#272C3C] border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Handle Doubt</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingAi}
                      onClick={() => handleRunSalesCopilot('close_order')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#1D212D] hover:bg-[#272C3C] border border-sky-500/30 text-sky-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3 h-3" />
                      <span>Close COD / Advance</span>
                    </button>
                  </div>

                  <select
                    value={preferredReplyLang}
                    onChange={(e) => setPreferredReplyLang(e.target.value as 'auto' | Language)}
                    className="px-2 py-1 rounded-lg bg-[#0C0E13] border border-neutral-700 text-[11px] text-neutral-200"
                    title="Reply Language Preference"
                  >
                    <option value="auto">Auto (BN/EN)</option>
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Gemini Vision & Urgency Insight Banner */}
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
                    {copilotInsight.urgencyAngle && (
                      <div className="text-amber-300/90">
                        Urgency Lever: {copilotInsight.urgencyAngle}
                      </div>
                    )}
                  </div>
                )}

                {/* Reply / Simulate Follow-up Form */}
                <form onSubmit={handleSendComposerMessage} className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
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
                        Send as Luxora Sales
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
                        Simulate Customer Follow-Up + AI
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => composerFileInputRef.current?.click()}
                      className="text-neutral-300 hover:text-[#D4AF37] flex items-center gap-1 cursor-pointer"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Attach Photo</span>
                    </button>
                    <input
                      ref={composerFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleComposerImageUpload}
                      className="hidden"
                    />
                  </div>

                  {composerImageDataUri && (
                    <div className="relative inline-block">
                      <img
                        src={composerImageDataUri}
                        alt="Attachment preview"
                        className="h-16 w-16 rounded-lg object-cover border border-[#D4AF37]/40"
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

                  <div className="flex items-end gap-2">
                    <textarea
                      rows={3}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={
                        replyMode === 'customer'
                          ? 'Simulate customer reply or objection (e.g. "100 tk kom hobe na?")...'
                          : 'Click "AI Auto-Analyze & Pitch" or craft your reply...'
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0B0D12] border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]/60 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isSendingMsg || (!replyDraft.trim() && !composerImageDataUri)}
                      className="px-4 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{replyMode === 'customer' ? 'Run Test' : 'Send & Copy'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANE: Smart Product Matcher & Fuzzy SKU Search (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#12141A] border border-neutral-800 flex flex-col overflow-hidden max-h-[760px]">
          <div className="p-3.5 border-b border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                {language === 'bn' ? 'স্মার্ট প্রোডাক্ট ম্যাচিং' : 'Smart Product Matcher'}
              </span>
              <span className="text-[10px] text-neutral-400">{products.length} Live SKUs</span>
            </div>

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
            {/* AI / Thread Matched Items */}
            {activeMatchedProducts.length > 0 && !catalogSearchQuery.trim() && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#D4AF37]">
                  Matched to Customer Query / Photo
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

            {/* Live Fuzzy Search Results */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                {catalogSearchQuery.trim() ? 'Fuzzy Catalog Matches' : 'Available Vault Stock'}
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
        </div>
      </div>

      {/* MODAL 1: Log / Simulate Incoming Social DM + Photo */}
      {isNewDmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {language === 'bn' ? 'নতুন কাস্টমার মেসেজ / ছবি টেস্ট' : 'Log Customer DM / Test Vision Photo'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Test any Messenger, WhatsApp, Instagram, or TikTok inquiry with partial text or screenshot.
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
                <label className="text-neutral-400 block mb-1.5">Social Channel</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['messenger', 'whatsapp', 'instagram', 'tiktok'] as SocialChannel[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setNewDmChannel(ch)}
                      className={`px-2.5 py-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                        newDmChannel === ch
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                          : 'bg-[#0C0E13] text-neutral-300 border-neutral-800'
                      }`}
                    >
                      <ChannelBadgeIcon channel={ch} className="w-3.5 h-3.5" />
                      <span>{CHANNEL_META[ch].short}</span>
                    </button>
                  ))}
                </div>
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
                  <label className="text-neutral-400 block mb-1">Phone or Handle (Optional)</label>
                  <input
                    type="text"
                    value={newDmHandle}
                    onChange={(e) => setNewDmHandle(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX or @user"
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Customer Message (Text or Partial Query)</label>
                <textarea
                  rows={3}
                  value={newDmText}
                  onChange={(e) => setNewDmText(e.target.value)}
                  placeholder='e.g. "b72 er price koto bhai? ektu kom rakha jabe?"'
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-400">Customer Product Photo / Screenshot (Gemini Vision)</label>
                  <button
                    type="button"
                    onClick={() => newDmFileInputRef.current?.click()}
                    className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Screenshot</span>
                  </button>
                  <input
                    ref={newDmFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleNewDmImageUpload}
                    className="hidden"
                  />
                </div>

                {newDmImageUri && (
                  <div className="relative inline-block">
                    <img
                      src={newDmImageUri}
                      alt="Uploaded DM screenshot"
                      className="h-24 w-24 rounded-xl object-cover border border-[#D4AF37]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setNewDmImageUri(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDmAutoCopilot}
                  onChange={(e) => setNewDmAutoCopilot(e.target.checked)}
                  className="accent-[#D4AF37]"
                />
                <span>Immediately analyze with Gemini Vision & draft sales closing reply</span>
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
                  disabled={isCreatingDm || (!newDmText.trim() && !newDmImageUri)}
                  className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingDm && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Analyze DM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Omnichannel Webhook & Channel Integration Setup */}
      {isAdmin && isChannelSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Omnichannel Webhook & Social Channel Setup</h3>
                <p className="text-[11px] text-neutral-400">
                  Connect Meta Messenger, WhatsApp Business Cloud API, Instagram DMs & TikTok DM webhooks.
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

            {/* Webhook Endpoint Card */}
            <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-neutral-400 font-medium">Callback Webhook URL (GET verify + POST events):</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookEndpointUrl);
                    addToast({
                      type: 'info',
                      titleEn: 'Webhook URL Copied',
                      titleBn: 'ওয়েবহুক লিংক কপি হয়েছে',
                    });
                  }}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <div className="font-mono text-[11px] text-emerald-300 bg-black/50 px-2.5 py-1.5 rounded-lg break-all border border-neutral-800">
                {webhookEndpointUrl}
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                <span>Verify Token: <code className="text-[#D4AF37] font-mono">luxora-omnichannel-verify</code></span>
                <span>Supports Meta Hub + Normalized JSON</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto">
              {editingChannels.map((cfg, idx) => {
                const meta = CHANNEL_META[cfg.id];
                return (
                  <div key={cfg.id} className="p-3.5 rounded-xl bg-[#161822] border border-neutral-800 space-y-2.5 text-xs">
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

                    <input
                      type="text"
                      value={cfg.pageOrBusinessId || ''}
                      onChange={(e) => {
                        const next = [...editingChannels];
                        next[idx] = { ...cfg, pageOrBusinessId: e.target.value };
                        setEditingChannels(next);
                      }}
                      placeholder="Page ID / WABA Phone ID (Optional)"
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
                className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 hover:text-white cursor-pointer"
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

      {/* MODAL 3: Process Order Directly From Social Chat (Accessible to Sales Agents, Supervisors & Super Admins) */}
      {isOrderModalOpen && selectedConversation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#12141A] border border-emerald-500/30 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? 'চ্যাট থেকে অর্ডার কনফার্ম করুন' : 'Process Order from Social Chat'}</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Create an official Luxora order & link confirmation directly to this {CHANNEL_META[selectedConversation.channel].short} thread.
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
                const prod = products.find((p) => p.id === orderProductId);
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
                  const deliveryCharge = prod.freeDelivery || subtotal >= 5000 ? 0 : 120;
                  const totalAmount = subtotal + deliveryCharge;

                  const created = await orderService.createOrder({
                    userId: user?.id || 'guest',
                    customer: {
                      name: orderCustomerName.trim(),
                      phone: orderCustomerPhone.trim(),
                      district: orderDistrict.trim() || 'Dhaka',
                      shippingAddress: orderAddress.trim(),
                      notes: `${orderNotes} | Processed by ${isSuperAdmin ? 'Super Admin' : 'Admin'} (${user?.email || 'admin'})`,
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
                    deliveryCharge,
                    discount: 0,
                    totalAmount,
                    paymentMethod: 'cod',
                    paymentOption: 'cod',
                    paymentStatus: 'pending',
                    orderStatus: 'Pending',
                  });

                  await updateConversationStatus(selectedConversation.id, 'converted');
                  setReplyDraft(
                    `ধন্যবাদ ${orderCustomerName.trim()}! আপনার ${prod.nameEn} (${qty}টি) অর্ডারটি কনফার্ম হয়েছে। অর্ডার আইডি: ${created.id} (মোট: ৳${totalAmount.toLocaleString('en-IN')}, ক্যাশ অন ডেলিভারি)। শীঘ্রই আমাদের কুরিয়ার টিম যোগাযোগ করবে।`
                  );
                  setIsOrderModalOpen(false);
                  addToast({
                    type: 'success',
                    titleEn: `Order ${created.id} Created`,
                    titleBn: `অর্ডার ${created.id} তৈরি হয়েছে`,
                    descriptionEn: 'Thread marked as Converted Sale & confirmation drafted in chat.',
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
                  {products.map((p) => (
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <span className="text-[11px] text-emerald-300 font-semibold px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    COD / MFS Pending
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
                  className="w-full px-3 py-2 rounded-xl bg-[#0C0E13] border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1A1D26] text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Order & Draft Confirmation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
        highlight
          ? 'bg-[#191610] border-[#D4AF37]/40'
          : 'bg-[#0C0E13] border-neutral-800 hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <img
          src={product.image}
          alt={product.nameEn}
          className="w-11 h-11 rounded-lg object-cover border border-neutral-800 shrink-0"
        />
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
