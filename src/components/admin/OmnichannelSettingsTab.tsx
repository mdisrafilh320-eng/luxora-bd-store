import React, { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Instagram,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Video,
  Webhook,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ChannelConnectionConfig, SocialChannel } from '../../types';
import {
  DEFAULT_CHANNEL_CONFIGS,
  ensureDefaultChannelConfigs,
  fetchServerChannelStatus,
  saveChannelConfig,
  subscribeToChannelConfigs,
  syncChannelConfigsToServer,
  triggerWebhookPipelineTest,
} from '../../services/omnichannelCrmService';

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
    subtitle: 'Meta Cloud API · Auto-reads text & WhatsApp product photos',
    accent: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30',
  },
  instagram: {
    title: 'Instagram Business Direct',
    subtitle: 'Instagram Messaging API · Story replies & product screenshot DMs',
    accent: 'text-pink-400',
    badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    border: 'border-pink-500/30',
  },
  tiktok: {
    title: 'TikTok Business Messaging',
    subtitle: 'TikTok Open API · Reel inquiries & Direct Message automation',
    accent: 'text-violet-300',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    border: 'border-violet-500/30',
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
  }
}

export const OmnichannelSettingsTab: React.FC = () => {
  const { isAdmin, language, products, addToast } = useApp();

  if (!isAdmin) {
    return null;
  }

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
  const [testCustomerName, setTestCustomerName] = useState('Tariq Hasan');
  const [testMessageText, setTestMessageText] = useState('Vai b72 earbud er fixed dam koto? 100 taka kom hobe?');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    aiAutoReply?: string;
    matchedNames: string[];
    dispatchStatus?: string;
    urgencyAngle?: string;
  } | null>(null);

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

    const unsub = subscribeToChannelConfigs((loaded) => {
      setConfigs(loaded);
      const customToken = loaded.find((c) => c.verifyToken && c.verifyToken.trim())?.verifyToken;
      if (customToken) setSharedVerifyToken(customToken);
      // Automatically keep backend webhook handler synchronized when settings are opened
      syncChannelConfigsToServer(loaded, customToken)
        .then((res) => {
          setLastSyncedAt(res.syncedAt);
          refreshServerDiagnostics();
        })
        .catch(() => {});
    });

    refreshServerDiagnostics();
    return () => unsub();
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
        // Keep Instagram Business ID mirrored with pageOrBusinessId for unified backend lookup
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
        titleEn: 'Omnichannel API Credentials Saved & Synced',
        titleBn: 'অমনিচ্যানেল এপিআই তথ্য সেভ ও সিঙ্ক হয়েছে',
        descriptionEn: 'Backend /api/webhooks/omnichannel is now connected to your updated channel keys.',
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
        descriptionEn: 'Queued to your AI Sales & Inbox tab for full inspection.',
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

  const webhookCallbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/omnichannel`
      : '/api/webhooks/omnichannel';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#171A24] to-[#12141A] border border-[#D4AF37]/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40">
              <ShieldCheck className="w-3 h-3" />
              Admin-Only Credential Vault
            </span>
            {lastSyncedAt && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Webhook Runtime Synced ({new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-display font-semibold text-white">
            {language === 'bn'
              ? 'অমনিচ্যানেল সেটিংস ও এপিআই কনফিগারেশন'
              : 'Omnichannel Settings & API Configuration'}
          </h2>
          <p className="text-xs text-neutral-400">
            {language === 'bn'
              ? 'Facebook Messenger, WhatsApp Business, Instagram এবং TikTok এপিআই টোকেন যুক্ত করুন যাতে রিয়েল কাস্টমার মেসেজ অটোমেটিক Gemini AI দিয়ে রিপ্লাই হয়।'
              : 'Connect your Meta/Facebook Page, WhatsApp Cloud API, Instagram Business ID, and TikTok App credentials directly to /api/webhooks/omnichannel for automated Gemini AI Sales replies.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSaveAllCredentials()}
          disabled={isSaving}
          className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/25 transition-all cursor-pointer disabled:opacity-60 shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{language === 'bn' ? 'সেভ ও সার্ভার সিঙ্ক করুন' : 'Save & Sync All Channels'}</span>
        </button>
      </div>

      {/* Global Webhook Endpoint & Verify Token Card */}
      <div className="p-5 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Webhook className="w-4 h-4 text-[#D4AF37]" />
          <span>Webhook Callback Endpoint & Verification Setup</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-neutral-400 block">
              Webhook Callback URL (Paste in Meta Developer App & TikTok Portal)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 font-mono text-[11px] text-emerald-300 break-all">
                {webhookCallbackUrl}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(webhookCallbackUrl);
                  addToast({
                    type: 'info',
                    titleEn: 'Webhook URL Copied',
                    titleBn: 'ওয়েবহুক ইউআরএল কপি হয়েছে',
                  });
                }}
                className="px-3 py-2.5 rounded-xl bg-[#1A1D27] hover:bg-[#232735] border border-neutral-700 text-neutral-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-400 block">
              Webhook Verify Token (hub.verify_token)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sharedVerifyToken}
                onChange={(e) => setSharedVerifyToken(e.target.value)}
                placeholder="luxora-omnichannel-verify"
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 font-mono text-[11px] text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(sharedVerifyToken);
                  addToast({
                    type: 'info',
                    titleEn: 'Verify Token Copied',
                    titleBn: 'ভেরিফাই টোকেন কপি হয়েছে',
                  });
                }}
                className="px-3 py-2.5 rounded-xl bg-[#1A1D27] hover:bg-[#232735] border border-neutral-700 text-neutral-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Channel Credential Cards */}
      <form onSubmit={handleSaveAllCredentials} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {configs.map((cfg) => {
          const meta = CHANNEL_UI_META[cfg.id];
          const diag = serverStatusMap[cfg.id];
          const hasLiveToken = Boolean(cfg.accessToken?.trim() || diag?.hasAccessToken);

          return (
            <div
              key={cfg.id}
              className={`p-5 rounded-2xl bg-[#12141A] border ${meta.border} space-y-4 shadow-xl`}
            >
              {/* Card Header */}
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
                        {hasLiveToken ? 'API Key Linked' : 'Needs Token'}
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
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[#D4AF37] font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.autoAiDraft}
                      onChange={(e) => updateField(cfg.id, 'autoAiDraft', e.target.checked)}
                      className="accent-[#D4AF37]"
                    />
                    <span>Auto-AI Reply</span>
                  </label>
                </div>
              </div>

              {/* Channel-Specific Credential Fields */}
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
                          placeholder="e.g. 10482910482910"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Page Handle / m.me Link</label>
                        <input
                          type="text"
                          value={cfg.handleOrNumber}
                          onChange={(e) => updateField('messenger', 'handleOrNumber', e.target.value)}
                          placeholder="m.me/luxorabd.official"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <SecretField
                      label="Meta / Facebook Page Access Token"
                      value={cfg.accessToken || ''}
                      revealed={Boolean(revealedFields['messenger_token'])}
                      onToggleReveal={() => toggleReveal('messenger_token')}
                      onChange={(val) => updateField('messenger', 'accessToken', val)}
                      placeholder="EAABsbCS1iHgBO..."
                    />

                    <SecretField
                      label="Meta App Secret (Optional · X-Hub-Signature Verification)"
                      value={cfg.appSecret || ''}
                      revealed={Boolean(revealedFields['messenger_secret'])}
                      onToggleReveal={() => toggleReveal('messenger_secret')}
                      onChange={(val) => updateField('messenger', 'appSecret', val)}
                      placeholder="32-char Meta App Secret"
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
                          placeholder="e.g. 38192048102938"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">WhatsApp Business Account ID (WABA)</label>
                        <input
                          type="text"
                          value={cfg.wabaId || ''}
                          onChange={(e) => updateField('whatsapp', 'wabaId', e.target.value)}
                          placeholder="e.g. 98210482910482"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-neutral-400 block mb-1">Business WhatsApp Phone Number</label>
                      <input
                        type="text"
                        value={cfg.handleOrNumber}
                        onChange={(e) => updateField('whatsapp', 'handleOrNumber', e.target.value)}
                        placeholder="+880 1871-693050"
                        className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <SecretField
                      label="WhatsApp Business Cloud API Permanent Access Token"
                      value={cfg.accessToken || ''}
                      revealed={Boolean(revealedFields['wa_token'])}
                      onToggleReveal={() => toggleReveal('wa_token')}
                      onChange={(val) => updateField('whatsapp', 'accessToken', val)}
                      placeholder="EAAGm0PX4ZCpsBA..."
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
                          placeholder="e.g. 1784140582910482"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Instagram Account Handle</label>
                        <input
                          type="text"
                          value={cfg.handleOrNumber}
                          onChange={(e) => updateField('instagram', 'handleOrNumber', e.target.value)}
                          placeholder="@luxorabd.luxury"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <SecretField
                      label="Instagram Messaging Access Token (Meta Graph Token)"
                      value={cfg.accessToken || ''}
                      revealed={Boolean(revealedFields['ig_token'])}
                      onToggleReveal={() => toggleReveal('ig_token')}
                      onChange={(val) => updateField('instagram', 'accessToken', val)}
                      placeholder="EAABsbCS1iHgIG..."
                    />
                  </>
                )}

                {cfg.id === 'tiktok' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-neutral-400 block mb-1">TikTok App Key / Client Key</label>
                        <input
                          type="text"
                          value={cfg.appKey || ''}
                          onChange={(e) => updateField('tiktok', 'appKey', e.target.value)}
                          placeholder="e.g. aw9k2m0x84p..."
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white font-mono text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">TikTok Account Handle</label>
                        <input
                          type="text"
                          value={cfg.handleOrNumber}
                          onChange={(e) => updateField('tiktok', 'handleOrNumber', e.target.value)}
                          placeholder="@luxorabd"
                          className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white text-[11px] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <SecretField
                      label="TikTok App Secret"
                      value={cfg.appSecret || ''}
                      revealed={Boolean(revealedFields['tiktok_secret'])}
                      onToggleReveal={() => toggleReveal('tiktok_secret')}
                      onChange={(val) => updateField('tiktok', 'appSecret', val)}
                      placeholder="TikTok Client / App Secret"
                    />

                    <SecretField
                      label="TikTok Business Messaging Access Token"
                      value={cfg.accessToken || ''}
                      revealed={Boolean(revealedFields['tiktok_token'])}
                      onToggleReveal={() => toggleReveal('tiktok_token')}
                      onChange={(val) => updateField('tiktok', 'accessToken', val)}
                      placeholder="act.tiktok_business_token..."
                    />
                  </>
                )}
              </div>

              {/* Channel Live Telemetry Footer */}
              <div className="pt-2 border-t border-neutral-800/70 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400">
                <span>
                  Last Webhook:{' '}
                  <strong className="text-neutral-200">
                    {diag?.lastWebhookAt
                      ? new Date(diag.lastWebhookAt).toLocaleString()
                      : 'Awaiting inbound event'}
                  </strong>
                </span>
                {diag?.lastDispatchStatus && (
                  <span className="text-emerald-300/90 truncate max-w-[260px]">
                    {diag.lastDispatchStatus}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="xl:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#D4AF37]/25 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>{language === 'bn' ? 'সকল এপিআই কী সংরক্ষণ করুন' : 'Save & Activate All Omnichannel Credentials'}</span>
          </button>
        </div>
      </form>

      {/* Interactive Webhook + Gemini Auto-Reply Pipeline Tester */}
      <div className="p-5 rounded-2xl bg-[#12141A] border border-[#D4AF37]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>Live Webhook + Gemini AI Auto-Reply Verifier</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Send a sample customer inquiry through the exact /api/webhooks/omnichannel backend pipeline to verify Gemini matching, auto-reply generation, and live API dispatch status.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunWebhookTest} className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
          <div className="lg:col-span-3">
            <label className="text-neutral-400 block mb-1">Channel</label>
            <select
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value as SocialChannel)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
            >
              <option value="messenger">Facebook Messenger</option>
              <option value="whatsapp">WhatsApp Business</option>
              <option value="instagram">Instagram Direct</option>
              <option value="tiktok">TikTok Business DM</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="text-neutral-400 block mb-1">Customer Name</label>
            <input
              type="text"
              value={testCustomerName}
              onChange={(e) => setTestCustomerName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="text-neutral-400 block mb-1">Incoming Customer DM</label>
            <input
              type="text"
              value={testMessageText}
              onChange={(e) => setTestMessageText(e.target.value)}
              placeholder='e.g. "b72 earbud ase? fixed price koto?"'
              className="w-full px-3 py-2.5 rounded-xl bg-[#0A0C10] border border-neutral-800 text-white"
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isRunningTest || !testMessageText.trim()}
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isRunningTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Run Test</span>
            </button>
          </div>
        </form>

        {testOutput && (
          <div className="p-4 rounded-xl bg-[#0A0C10] border border-emerald-500/30 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#D4AF37] flex items-center gap-1.5">
                <Bot className="w-4 h-4" />
                Gemini AI Sales Assistant Auto-Reply
              </span>
              {testOutput.dispatchStatus && (
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                  {testOutput.dispatchStatus}
                </span>
              )}
            </div>

            {testOutput.matchedNames.length > 0 && (
              <div className="text-emerald-300 text-[11px]">
                Matched Products: {testOutput.matchedNames.join(' · ')}
              </div>
            )}

            <div className="p-3 rounded-lg bg-[#141720] border border-neutral-800 text-neutral-100 whitespace-pre-wrap leading-relaxed">
              {testOutput.aiAutoReply}
            </div>
          </div>
        )}
      </div>
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
