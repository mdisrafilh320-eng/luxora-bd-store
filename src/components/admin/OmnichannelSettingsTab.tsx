import React, { useEffect, useState } from 'react';
import {
  Bot,
  Brain,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  Instagram,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Video,
  Webhook,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AiTrainingConfig,
  AiTrainingFaq,
  ChannelConnectionConfig,
  ConversationAiMode,
  CrmEntryType,
  LogisticsAndSheetsConfig,
  SocialChannel,
} from '../../types';
import {
  DEFAULT_AI_TRAINING_CONFIG,
  DEFAULT_CHANNEL_CONFIGS,
  DEFAULT_LOGISTICS_CONFIG,
  downloadOrdersCsvForGoogleSheets,
  ensureDefaultChannelConfigs,
  fetchServerChannelStatus,
  saveAiTrainingConfig,
  saveChannelConfig,
  saveLogisticsConfig,
  subscribeToAiTrainingConfig,
  subscribeToChannelConfigs,
  subscribeToLogisticsConfig,
  syncChannelConfigsToServer,
  syncExternalCatalog,
  syncOrdersToGoogleSheets,
  triggerWebhookPipelineTest,
} from '../../services/omnichannelCrmService';
import { orderService } from '../../services/orderService';
import { copyTextToClipboard } from '../../services/shareService';

const CHANNEL_UI_META: Record<
  SocialChannel,
  {
    title: string;
    subtitle: string;
    accent: string;
    badgeBg: string;
    border: string;
  }
> = {
  messenger: {
    title: 'Meta / Facebook Messenger',
    subtitle: 'Meta Graph API v21.0 · Page DMs & Comment-to-DM Replies',
    accent: 'text-sky-400',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/30',
  },
  whatsapp: {
    title: 'WhatsApp Business Cloud API',
    subtitle: 'Meta Cloud API · Text, Voice Notes & Product Screenshot Matching',
    accent: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
  },
  instagram: {
    title: 'Instagram Business Direct',
    subtitle: 'Instagram Messaging API · Reel Comments, Story Replies & Screenshot DMs',
    accent: 'text-pink-400',
    badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    border: 'border-pink-500/30',
  },
  tiktok: {
    title: 'TikTok Business Messaging',
    subtitle: 'TikTok Open API · Reel Comment Leads & Direct Message Automation',
    accent: 'text-violet-300',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    border: 'border-violet-500/30',
  },
  web: {
    title: 'Website Live Chat Widget',
    subtitle: 'Built-in Storefront AI Concierge · Auto-Bridged into Unified Sales Inbox',
    accent: 'text-[#D4AF37]',
    badgeBg: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
    border: 'border-[#D4AF37]/30',
  },
};

function ChannelIcon({ channel, className = 'w-4 h-4' }: { channel: SocialChannel; className?: string }) {
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

type SettingsSubTab = 'channels' | 'ai_training' | 'catalog_sync' | 'logistics_sheets';

export const OmnichannelSettingsTab: React.FC = () => {
  const { isAdmin, language, products, addToast } = useApp();
  const [subTab, setSubTab] = useState<SettingsSubTab>('channels');

  // Channel Credentials State
  const [configs, setConfigs] = useState<ChannelConnectionConfig[]>(DEFAULT_CHANNEL_CONFIGS);
  const [sharedVerifyToken, setSharedVerifyToken] = useState('luxora-omnichannel-verify');
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [serverStatusMap, setServerStatusMap] = useState<
    Record<string, { hasAccessToken: boolean; lastWebhookAt: string | null; lastDispatchStatus: string | null }>
  >({});

  // Live Webhook + Gemini Auto-Reply Tester State
  const [testChannel, setTestChannel] = useState<SocialChannel>('messenger');
  const [testEntryType, setTestEntryType] = useState<CrmEntryType>('dm');
  const [testCustomerName, setTestCustomerName] = useState('Tariq Hasan');
  const [testMessageText, setTestMessageText] = useState('Vai b72 earbud er fixed dam koto? Dhaka Mirpur e delivery charge koto?');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    aiAutoReply?: string;
    matchedNames: string[];
    dispatchStatus?: string;
    urgencyAngle?: string;
  } | null>(null);

  // AI Training & Business Rules State
  const [training, setTraining] = useState<AiTrainingConfig>(DEFAULT_AI_TRAINING_CONFIG);
  const [isSavingTraining, setIsSavingTraining] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // External Catalog Sync State
  const [syncSource, setSyncSource] = useState<'csv' | 'facebook' | 'shopify' | 'woocommerce'>('csv');
  const [syncPayloadText, setSyncPayloadText] = useState(
    'name,price,brand,category,stock,sku\nLuxora MagSafe PowerBank 10000mAh,2450,Anker,powerbanks,18,LUX-PB-10K\nLuxury Rose Crystal Lamp Pro,1490,Luxora,lamps,25,LUX-LMP-ROSE'
  );
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);

  // Logistics (Steadfast / Pathao) & Google Sheets State
  const [logistics, setLogistics] = useState<LogisticsAndSheetsConfig>(DEFAULT_LOGISTICS_CONFIG);
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);
  const [isPushingSheets, setIsPushingSheets] = useState(false);

  const refreshServerDiagnostics = async () => {
    const status = await fetchServerChannelStatus();
    if (status) {
      if (status.verifyToken) setSharedVerifyToken(status.verifyToken);
      const next: Record<string, { hasAccessToken: boolean; lastWebhookAt: string | null; lastDispatchStatus: string | null }> = {};
      for (const ch of status.channels) {
        next[ch.id] = {
          hasAccessToken: ch.hasAccessToken,
          lastWebhookAt: ch.lastWebhookAt,
          lastDispatchStatus: ch.lastDispatchStatus,
        };
      }
      setServerStatusMap(next);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    ensureDefaultChannelConfigs().catch(() => {});

    const unsubChannels = subscribeToChannelConfigs((loaded) => {
      setConfigs(loaded);
      const customToken = loaded.find((c) => c.verifyToken && c.verifyToken.trim())?.verifyToken;
      if (customToken) setSharedVerifyToken(customToken);
      syncChannelConfigsToServer(loaded, customToken)
        .then((res) => {
          setLastSyncedAt(res.syncedAt);
          refreshServerDiagnostics();
        })
        .catch(() => {});
    });

    const unsubTraining = subscribeToAiTrainingConfig((cfg) => {
      setTraining(cfg);
    });

    const unsubLogistics = subscribeToLogisticsConfig((cfg) => {
      setLogistics(cfg);
    });

    refreshServerDiagnostics();
    return () => {
      unsubChannels();
      unsubTraining();
      unsubLogistics();
    };
  }, [isAdmin]);

  const toggleReveal = (key: string) => {
    setRevealedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateField = (
    channelId: SocialChannel,
    field: keyof ChannelConnectionConfig,
    value: string | boolean
  ) => {
    setConfigs((prev) =>
      prev.map((c) => {
        if (c.id !== channelId) return c;
        const updated = { ...c, [field]: value };
        if (channelId === 'instagram' && field === 'instagramBusinessId' && typeof value === 'string') {
          updated.pageOrBusinessId = value;
        }
        return updated;
      })
    );
  };

  const handleSaveAllCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const cleanToken = sharedVerifyToken.trim() || 'luxora-omnichannel-verify';
      const normalizedConfigs = configs.map((c) => ({
        ...c,
        verifyToken: cleanToken,
        pageOrBusinessId:
          c.id === 'instagram' && c.instagramBusinessId
            ? c.instagramBusinessId.trim()
            : (c.pageOrBusinessId || '').trim(),
      }));

      for (const cfg of normalizedConfigs) {
        await saveChannelConfig(cfg);
      }

      const syncRes = await syncChannelConfigsToServer(normalizedConfigs, cleanToken);
      setLastSyncedAt(syncRes.syncedAt);
      await refreshServerDiagnostics();

      addToast({
        type: 'success',
        titleEn: 'Omnichannel Credentials Saved & Synced',
        titleBn: 'অমনিচ্যানেল এপিআই তথ্য সেভ ও সিঙ্ক হয়েছে',
        descriptionEn: 'Backend webhook pipeline is connected to your updated channels.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Save Credentials',
        titleBn: 'তথ্য সেভ করতে ব্যর্থ',
        descriptionEn: err?.message || 'Could not update omnichannel configuration.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunWebhookTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessageText.trim()) return;
    setIsRunningTest(true);
    setTestOutput(null);
    try {
      const ev = await triggerWebhookPipelineTest({
        channel: testChannel,
        entryType: testEntryType,
        postTitleOrId: testEntryType === 'comment' ? 'Featured Promo Post #12' : undefined,
        customerName: testCustomerName,
        text: testMessageText,
        catalog: products,
      });

      const matchedNames = (ev.aiMatchedProductIds || [])
        .map((id) => products.find((p) => p.id === id)?.nameEn || id)
        .filter(Boolean);

      setTestOutput({
        aiAutoReply: ev.aiAutoReply,
        matchedNames,
        dispatchStatus: ev.dispatchStatus,
        urgencyAngle: ev.aiUrgencyAngle,
      });

      await refreshServerDiagnostics();

      addToast({
        type: 'success',
        titleEn: 'Webhook + Gemini Auto-Reply Executed',
        titleBn: 'ওয়েবহুক ও এআই অটো-রিপ্লাই টেস্ট সফল',
        descriptionEn: 'Event queued into Unified AI Sales Inbox.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Webhook Test Failed',
        titleBn: 'ওয়েবহুক টেস্ট ব্যর্থ হয়েছে',
        descriptionEn: err?.message || 'Unable to execute webhook pipeline test.',
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleSaveAiTraining = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingTraining(true);
    try {
      await saveAiTrainingConfig(training);
      addToast({
        type: 'success',
        titleEn: 'AI Training & Business Rules Saved',
        titleBn: 'এআই ট্রেনিং ও রুলস সংরক্ষিত',
        descriptionEn: 'Gemini Sales AI now applies your updated rules, FAQs & Hand-off mode.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Save AI Training',
        titleBn: 'এআই ট্রেনিং সেভ ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsSavingTraining(false);
    }
  };

  const handleSyncExternalCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncPayloadText.trim()) return;
    setIsSyncingCatalog(true);
    try {
      const res = await syncExternalCatalog(syncSource, syncPayloadText);
      const updatedTraining: AiTrainingConfig = {
        ...training,
        externalCatalog: res.items,
        lastCatalogSyncAt: new Date().toISOString(),
      };
      setTraining(updatedTraining);
      await saveAiTrainingConfig(updatedTraining);
      addToast({
        type: 'success',
        titleEn: `Synced ${res.importedCount} External SKUs (${syncSource.toUpperCase()})`,
        titleBn: `${res.importedCount}টি প্রোডাক্ট এআই ক্যাটালগে যুক্ত হয়েছে`,
        descriptionEn: `Total AI external catalog items: ${res.totalExternalCatalog}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Catalog Sync Failed',
        titleBn: 'ক্যাটালগ সিঙ্ক ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleCsvOrJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSyncPayloadText(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveLogistics = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingLogistics(true);
    try {
      await saveLogisticsConfig(logistics);
      addToast({
        type: 'success',
        titleEn: 'Courier & Google Sheets Credentials Saved',
        titleBn: 'কুরিয়ার ও গুগল শিট সেটিংস সেভ হয়েছে',
        descriptionEn: 'Steadfast, Pathao & Google Sheets integrations updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Save Logistics Settings',
        titleBn: 'লজিস্টিক্স সেটিংস সেভ ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleExportOrPushSheets = async (downloadCsvOnly = false) => {
    setIsPushingSheets(true);
    try {
      const orders = await orderService.getAllOrders();
      if (downloadCsvOnly) {
        downloadOrdersCsvForGoogleSheets(orders);
        addToast({
          type: 'success',
          titleEn: `Exported ${orders.length} Orders CSV`,
          titleBn: `${orders.length}টি অর্ডার CSV ডাউনলোড হয়েছে`,
          descriptionEn: 'Import directly into Google Sheets (File → Import).',
        });
      } else {
        const res = await syncOrdersToGoogleSheets(orders, logistics.googleSheetsWebhookUrl);
        addToast({
          type: 'success',
          titleEn: res.pushedLive ? 'Orders Pushed to Google Sheets' : 'Sheet Payload Prepared',
          titleBn: res.pushedLive ? 'গুগল শিটে অর্ডার সিঙ্ক হয়েছে' : 'শিট পে-লোড প্রস্তুত',
          descriptionEn: res.message,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Google Sheets Sync Error',
        titleBn: 'গুগল শিট সিঙ্ক ত্রুটি',
        descriptionEn: err?.message,
      });
    } finally {
      setIsPushingSheets(false);
    }
  };

  const webhookCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/omnichannel`
      : '/api/webhooks/omnichannel';

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#171A24] to-[#12141A] border border-[#D4AF37]/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40">
              <ShieldCheck className="w-3 h-3" />
              Omnichannel Automation & AI Training Hub
            </span>
            {lastSyncedAt && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Runtime Synced ({new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-display font-semibold text-white">
            {language === 'bn'
              ? 'অমনিচ্যানেল এপিআই, এআই ট্রেনিং ও লজিস্টিক্স কনফিগারেশন'
              : 'Omnichannel APIs, AI Training, Catalog Sync & Courier/Sheets'}
          </h2>
          <p className="text-xs text-neutral-400">
            Configure social API keys, train Gemini on your business rules & FAQs, sync external catalogs, and connect Steadfast, Pathao & Google Sheets.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3 text-xs">
        {(
          [
            { id: 'channels', label: 'Channels & Webhooks', icon: Webhook },
            { id: 'ai_training', label: 'AI Training & Rules', icon: Brain },
            {
              id: 'catalog_sync',
              label: `Catalog Sync (${products.length + (training.externalCatalog?.length || 0)})`,
              icon: Database,
            },
            { id: 'logistics_sheets', label: 'Courier & Google Sheets', icon: Truck },
          ] as Array<{ id: SettingsSubTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                active
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-[#12141A] text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: CHANNELS & WEBHOOKS */}
      {subTab === 'channels' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Webhook className="w-4 h-4 text-[#D4AF37]" />
                <span>Webhook Callback Endpoint & Verification Setup</span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveAllCredentials()}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save & Sync All Channels</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-neutral-400 block">
                  Webhook Callback URL (Meta Graph API / WhatsApp / TikTok)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 font-mono text-[11px] text-emerald-300 break-all">
                    {webhookCallbackUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void copyTextToClipboard(webhookCallbackUrl);
                      addToast({ type: 'info', titleEn: 'Webhook URL Copied', titleBn: 'ওয়েবহুক ইউআরএল কপি হয়েছে' });
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#1A1D27] hover:bg-[#232735] border border-neutral-700 text-neutral-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#D4AF37]" /> Copy
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-400 block">Webhook Verify Token (hub.verify_token)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sharedVerifyToken}
                    onChange={(e) => setSharedVerifyToken(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 font-mono text-[11px] text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void copyTextToClipboard(sharedVerifyToken);
                      addToast({ type: 'info', titleEn: 'Verify Token Copied', titleBn: 'টোকেন কপি হয়েছে' });
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#1A1D27] hover:bg-[#232735] border border-neutral-700 text-neutral-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#D4AF37]" /> Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAllCredentials} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {configs.map((cfg) => {
              const meta = CHANNEL_UI_META[cfg.id];
              const diag = serverStatusMap[cfg.id];
              const hasLiveToken = cfg.id === 'web' || Boolean(cfg.accessToken?.trim() || diag?.hasAccessToken);

              return (
                <div key={cfg.id} className={`p-5 rounded-2xl bg-[#12141A] border ${meta.border} space-y-4 shadow-xl`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-800/80 pb-3.5">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border ${meta.badgeBg}`}>
                        <ChannelIcon channel={cfg.id} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>{meta.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              hasLiveToken
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {cfg.id === 'web' ? 'Built-in Live' : hasLiveToken ? 'API Key Linked' : 'Needs Token'}
                          </span>
                        </h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{meta.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.connected}
                          onChange={(e) => updateField(cfg.id, 'connected', e.target.checked)}
                          className="accent-[#D4AF37]"
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-1.5 text-[#D4AF37] font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfg.autoAiDraft}
                          onChange={(e) => updateField(cfg.id, 'autoAiDraft', e.target.checked)}
                          className="accent-[#D4AF37]"
                        />
                        Auto-AI
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    {cfg.id === 'messenger' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-neutral-400 block mb-1">Facebook Page ID</label>
                            <input
                              type="text"
                              value={cfg.pageOrBusinessId || ''}
                              onChange={(e) => updateField('messenger', 'pageOrBusinessId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-400 block mb-1">Page Handle / m.me</label>
                            <input
                              type="text"
                              value={cfg.handleOrNumber}
                              onChange={(e) => updateField('messenger', 'handleOrNumber', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px]"
                            />
                          </div>
                        </div>
                        <SecretField
                          label="Meta / Facebook Page Access Token"
                          value={cfg.accessToken || ''}
                          revealed={Boolean(revealedFields['messenger_token'])}
                          onToggleReveal={() => toggleReveal('messenger_token')}
                          onChange={(val) => updateField('messenger', 'accessToken', val)}
                          placeholder="EAABsbCS..."
                        />
                      </>
                    )}

                    {cfg.id === 'whatsapp' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-neutral-400 block mb-1">WhatsApp Phone Number ID</label>
                            <input
                              type="text"
                              value={cfg.pageOrBusinessId || ''}
                              onChange={(e) => updateField('whatsapp', 'pageOrBusinessId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-400 block mb-1">WABA ID</label>
                            <input
                              type="text"
                              value={cfg.wabaId || ''}
                              onChange={(e) => updateField('whatsapp', 'wabaId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                            />
                          </div>
                        </div>
                        <SecretField
                          label="WhatsApp Business Cloud API Token"
                          value={cfg.accessToken || ''}
                          revealed={Boolean(revealedFields['wa_token'])}
                          onToggleReveal={() => toggleReveal('wa_token')}
                          onChange={(val) => updateField('whatsapp', 'accessToken', val)}
                          placeholder="EAAGm0PX..."
                        />
                      </>
                    )}

                    {cfg.id === 'instagram' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-neutral-400 block mb-1">Instagram Business ID</label>
                            <input
                              type="text"
                              value={cfg.instagramBusinessId || cfg.pageOrBusinessId || ''}
                              onChange={(e) => updateField('instagram', 'instagramBusinessId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-400 block mb-1">Instagram Handle</label>
                            <input
                              type="text"
                              value={cfg.handleOrNumber}
                              onChange={(e) => updateField('instagram', 'handleOrNumber', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px]"
                            />
                          </div>
                        </div>
                        <SecretField
                          label="Instagram Messaging Access Token"
                          value={cfg.accessToken || ''}
                          revealed={Boolean(revealedFields['ig_token'])}
                          onToggleReveal={() => toggleReveal('ig_token')}
                          onChange={(val) => updateField('instagram', 'accessToken', val)}
                          placeholder="EAABsbCS..."
                        />
                      </>
                    )}

                    {cfg.id === 'tiktok' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-neutral-400 block mb-1">TikTok App Key</label>
                            <input
                              type="text"
                              value={cfg.appKey || ''}
                              onChange={(e) => updateField('tiktok', 'appKey', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                            />
                          </div>
                          <div>
                            <label className="text-neutral-400 block mb-1">TikTok Handle</label>
                            <input
                              type="text"
                              value={cfg.handleOrNumber}
                              onChange={(e) => updateField('tiktok', 'handleOrNumber', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px]"
                            />
                          </div>
                        </div>
                        <SecretField
                          label="TikTok Business Access Token"
                          value={cfg.accessToken || ''}
                          revealed={Boolean(revealedFields['tiktok_token'])}
                          onToggleReveal={() => toggleReveal('tiktok_token')}
                          onChange={(val) => updateField('tiktok', 'accessToken', val)}
                          placeholder="act.tiktok..."
                        />
                      </>
                    )}

                    {cfg.id === 'web' && (
                      <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#D4AF37]/25 text-[11px] text-neutral-300 space-y-1">
                        <p className="text-[#D4AF37] font-semibold">Live Website AI Concierge Bridge Active</p>
                        <p>
                          Messages submitted through the floating Luxora AI Chat widget on the storefront automatically appear inside the Unified Inbox under <strong>Web Chat</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="xl:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Save & Activate Channel Credentials</span>
              </button>
            </div>
          </form>

          {/* Interactive Webhook Simulator */}
          <div className="p-5 rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>Webhook, Post Comment & Banglish AI Pipeline Simulator</span>
            </h3>

            <form onSubmit={handleRunWebhookTest} className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="text-neutral-400 block mb-1">Channel</label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value as SocialChannel)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                >
                  <option value="messenger">Messenger</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="web">Web Chat</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-neutral-400 block mb-1">Type</label>
                <select
                  value={testEntryType}
                  onChange={(e) => setTestEntryType(e.target.value as CrmEntryType)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                >
                  <option value="dm">Direct DM</option>
                  <option value="comment">Post Comment</option>
                  <option value="web_chat">Web Chat</option>
                </select>
              </div>
              <div className="lg:col-span-2">
                <label className="text-neutral-400 block mb-1">Customer</label>
                <input
                  type="text"
                  value={testCustomerName}
                  onChange={(e) => setTestCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
              <div className="lg:col-span-4">
                <label className="text-neutral-400 block mb-1">Message / Comment</label>
                <input
                  type="text"
                  value={testMessageText}
                  onChange={(e) => setTestMessageText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
              <div className="lg:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isRunningTest}
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isRunningTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>Run Test</span>
                </button>
              </div>
            </form>

            {testOutput && (
              <div className="p-4 rounded-xl bg-[#0A0C10] border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#D4AF37]">Gemini AI Sales Auto-Reply:</span>
                  <span className="text-neutral-400 font-mono text-[10px]">{testOutput.dispatchStatus}</span>
                </div>
                {testOutput.matchedNames.length > 0 && (
                  <p className="text-emerald-300 text-[11px]">Matched: {testOutput.matchedNames.join(' · ')}</p>
                )}
                <div className="p-3 rounded-lg bg-[#141720] text-neutral-100 whitespace-pre-wrap">{testOutput.aiAutoReply}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI TRAINING, BUSINESS RULES, FAQs & HAND-OFF */}
      {subTab === 'ai_training' && (
        <form onSubmit={handleSaveAiTraining} className="space-y-5 text-xs">
          <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#D4AF37]" />
                  <span>Luxora AI Persona, Business Rules & Delivery Policies</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Gemini uses these exact instructions across Messenger, Instagram, WhatsApp, TikTok & Website Live Chat.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSavingTraining}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingTraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save & Sync Training</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-neutral-400 block mb-1">Default Inbound AI Control Mode</label>
                <select
                  value={training.defaultAiMode}
                  onChange={(e) => setTraining({ ...training, defaultAiMode: e.target.value as ConversationAiMode })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                >
                  <option value="auto_pilot">AI Auto-Pilot (Reply & Confirm Instantly)</option>
                  <option value="review_mode">Review Mode (Draft Replies for Human Approval)</option>
                  <option value="human_takeover">Human Takeover Default (Pause Auto-Replies)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={training.autoDetectBanglish}
                    onChange={(e) => setTraining({ ...training, autoDetectBanglish: e.target.checked })}
                    className="accent-[#D4AF37]"
                  />
                  <span>Banglish + Bengali Fluency</span>
                </label>
                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={training.autoCreateOrderFromChat}
                    onChange={(e) => setTraining({ ...training, autoCreateOrderFromChat: e.target.checked })}
                    className="accent-[#D4AF37]"
                  />
                  <span>Auto-Extract Order Details</span>
                </label>
                <label className="flex items-center gap-2 text-rose-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={training.autoEscalateComplaints}
                    onChange={(e) => setTraining({ ...training, autoEscalateComplaints: e.target.checked })}
                    className="accent-rose-500"
                  />
                  <span>Auto-Escalate Complaints</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-neutral-400 block mb-1">Brand Persona & Tone</label>
                <textarea
                  rows={3}
                  value={training.storePersona}
                  onChange={(e) => setTraining({ ...training, storePersona: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Core Business Rules</label>
                <textarea
                  rows={3}
                  value={training.businessRules}
                  onChange={(e) => setTraining({ ...training, businessRules: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Delivery Fee & Courier Rules</label>
                <textarea
                  rows={2}
                  value={training.deliveryPolicyText}
                  onChange={(e) => setTraining({ ...training, deliveryPolicyText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">Fixed-Price & Negotiation Guardrail</label>
                <textarea
                  rows={2}
                  value={training.fixedPricePolicy}
                  onChange={(e) => setTraining({ ...training, fixedPricePolicy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
              </div>
            </div>

            {/* FAQ Knowledge Base */}
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <h4 className="font-semibold text-white">Trained Store FAQs ({training.faqs.length})</h4>
              <div className="space-y-2">
                {training.faqs.map((faq) => (
                  <div key={faq.id} className="p-3 rounded-xl bg-[#0A0C10] border border-neutral-800 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#D4AF37]">Q: {faq.question}</p>
                      <p className="text-neutral-300">A: {faq.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTraining({
                          ...training,
                          faqs: training.faqs.filter((f) => f.id !== faq.id),
                        })
                      }
                      className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  placeholder="New Customer Question (EN/BN)..."
                  className="md:col-span-5 px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
                <input
                  type="text"
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Exact Approved Answer..."
                  className="md:col-span-5 px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
                    const item: AiTrainingFaq = {
                      id: `faq-${Date.now().toString(36)}`,
                      question: newFaqQuestion.trim(),
                      answer: newFaqAnswer.trim(),
                    };
                    setTraining({ ...training, faqs: [...training.faqs, item] });
                    setNewFaqQuestion('');
                    setNewFaqAnswer('');
                  }}
                  className="md:col-span-2 px-3 py-2 rounded-xl bg-[#1A1D26] hover:bg-[#252A38] border border-neutral-700 text-[#D4AF37] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: CATALOG SYNC (CSV / FACEBOOK / SHOPIFY / WOOCOMMERCE) */}
      {subTab === 'catalog_sync' && (
        <div className="space-y-5 text-xs">
          <form onSubmit={handleSyncExternalCatalog} className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D4AF37]" />
                  <span>External Catalog Sync (CSV, Facebook Posts, Shopify, WooCommerce)</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Live Store SKUs ({products.length}) are synced automatically. Import extra SKUs so AI quotes accurate stock & prices everywhere.
                </p>
              </div>

              <label className="px-3 py-2 rounded-xl bg-[#1A1D26] hover:bg-[#242836] border border-neutral-700 text-neutral-200 font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Upload CSV / JSON</span>
                <input type="file" accept=".csv,.json,.txt" onChange={handleCsvOrJsonFileUpload} className="hidden" />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'csv', label: 'CSV Spreadsheet' },
                  { id: 'facebook', label: 'Facebook Page Posts' },
                  { id: 'shopify', label: 'Shopify JSON Feed' },
                  { id: 'woocommerce', label: 'WooCommerce JSON' },
                ] as const
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    setSyncSource(src.id);
                    if (src.id === 'facebook') {
                      setSyncPayloadText('Luxury B72 Gaming Earbuds - 1950 BDT - In Stock\n3D Moon Crystal Lamp - 1290 BDT - In Stock');
                    } else if (src.id === 'shopify' || src.id === 'woocommerce') {
                      setSyncPayloadText(
                        JSON.stringify(
                          [{ name: 'Luxora Titanium Watch Series 9', price: 4850, brand: 'Luxora', stock: 12, sku: 'LUX-W9' }],
                          null,
                          2
                        )
                      );
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-semibold cursor-pointer ${
                    syncSource === src.id
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-[#0A0C10] text-neutral-300 border-neutral-800'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            <textarea
              rows={5}
              value={syncPayloadText}
              onChange={(e) => setSyncPayloadText(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0A0C10] border border-neutral-800 font-mono text-[11px] text-emerald-200 focus:outline-none focus:border-[#D4AF37]"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSyncingCatalog}
                className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isSyncingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Parse & Sync to AI Knowledge Base</span>
              </button>
            </div>
          </form>

          {/* Preview of Synced External Items */}
          {(training.externalCatalog?.length || 0) > 0 && (
            <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">
                  Synced External Catalog ({training.externalCatalog.length} items)
                </h4>
                <button
                  type="button"
                  onClick={() => saveAiTrainingConfig({ ...training, externalCatalog: [] })}
                  className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                >
                  Clear External Items
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {training.externalCatalog.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-[#0A0C10] border border-neutral-800 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white truncate">{item.nameEn}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] uppercase">
                        {item.source}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span className="font-mono text-emerald-300 font-bold">৳{item.price.toLocaleString()}</span>
                      <span>Stock: {item.stockCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: COURIER (STEADFAST / PATHAO) & GOOGLE SHEETS */}
      {subTab === 'logistics_sheets' && (
        <form onSubmit={handleSaveLogistics} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Steadfast & Pathao Courier Config */}
            <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#D4AF37]" />
                <span>Steadfast & Pathao Courier API Integration</span>
              </h3>

              <div className="space-y-3 border-b border-neutral-800 pb-4">
                <p className="font-semibold text-emerald-300">Steadfast Courier (Packzy API)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SecretField
                    label="Steadfast Api-Key"
                    value={logistics.steadfastApiKey}
                    revealed={Boolean(revealedFields['sf_key'])}
                    onToggleReveal={() => toggleReveal('sf_key')}
                    onChange={(v) => setLogistics({ ...logistics, steadfastApiKey: v })}
                    placeholder="Steadfast API Key"
                  />
                  <SecretField
                    label="Steadfast Secret-Key"
                    value={logistics.steadfastSecretKey}
                    revealed={Boolean(revealedFields['sf_secret'])}
                    onToggleReveal={() => toggleReveal('sf_secret')}
                    onChange={(v) => setLogistics({ ...logistics, steadfastSecretKey: v })}
                    placeholder="Steadfast Secret Key"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-sky-300">Pathao Courier Hermes API</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Pathao Store ID</label>
                    <input
                      type="text"
                      value={logistics.pathaoStoreId}
                      onChange={(e) => setLogistics({ ...logistics, pathaoStoreId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px]"
                    />
                  </div>
                  <SecretField
                    label="Pathao Bearer Access Token"
                    value={logistics.pathaoAccessToken}
                    revealed={Boolean(revealedFields['pth_tok'])}
                    onToggleReveal={() => toggleReveal('pth_tok')}
                    onChange={(v) => setLogistics({ ...logistics, pathaoAccessToken: v })}
                    placeholder="eyJ0eXAi..."
                  />
                </div>
              </div>
            </div>

            {/* Google Sheets & Shopify/WooCommerce Store Links */}
            <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Google Sheets Automation & Storefront Connectors</span>
              </h3>

              <div>
                <label className="text-neutral-400 block mb-1">Google Sheets Apps Script Webhook URL</label>
                <input
                  type="url"
                  value={logistics.googleSheetsWebhookUrl}
                  onChange={(e) => setLogistics({ ...logistics, googleSheetsWebhookUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-emerald-300 font-mono text-[11px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isPushingSheets}
                  onClick={() => handleExportOrPushSheets(false)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isPushingSheets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  <span>Sync All Orders to Google Sheets</span>
                </button>
                <button
                  type="button"
                  disabled={isPushingSheets}
                  onClick={() => handleExportOrPushSheets(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#1A1D26] hover:bg-[#232735] border border-neutral-700 text-neutral-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Download Orders CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                <div>
                  <label className="text-neutral-400 block mb-1">Shopify Store URL (Optional)</label>
                  <input
                    type="text"
                    value={logistics.shopifyStoreUrl}
                    onChange={(e) => setLogistics({ ...logistics, shopifyStoreUrl: e.target.value })}
                    placeholder="mystore.myshopify.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">WooCommerce Store URL (Optional)</label>
                  <input
                    type="text"
                    value={logistics.wooCommerceStoreUrl}
                    onChange={(e) => setLogistics({ ...logistics, wooCommerceStoreUrl: e.target.value })}
                    placeholder="https://store.luxorabd.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingLogistics}
              className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              {isSavingLogistics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Courier & Google Sheets Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

interface SecretFieldProps {
  label: string;
  value: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SecretField: React.FC<SecretFieldProps> = ({
  label,
  value,
  revealed,
  onToggleReveal,
  onChange,
  placeholder,
}) => {
  return (
    <div>
      <label className="text-neutral-400 block mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-3 pr-9 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="absolute right-2.5 text-neutral-400 hover:text-white p-0.5 cursor-pointer"
          title={revealed ? 'Hide credential' : 'Show credential'}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
