import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck,
  Phone, 
  ToggleLeft, 
  ToggleRight, 
  Copy, 
  Check, 
  Info, 
  Smartphone, 
  Building2, 
  Truck, 
  Sparkles,
  HelpCircle,
  Eye,
  Sliders,
  RotateCcw,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentSettings, MfsGatewayConfig, MfsAccountType } from '../../types';
import { DEFAULT_PAYMENT_SETTINGS } from '../../services/paymentService';
import { formatBDT } from '../../translations';
import { validateBangladeshiPhone } from '../../utils/security';

export const PaymentSettingsTab: React.FC = () => {
  const { 
    language, 
    paymentSettings, 
    updatePaymentSettings, 
    refreshPaymentSettings, 
    isLoadingPaymentSettings,
    isSuperAdmin,
    addToast 
  } = useApp();

  // Local draft state for the form
  const [formData, setFormData] = useState<PaymentSettings>(paymentSettings || DEFAULT_PAYMENT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [previewGateway, setPreviewGateway] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');

  // Keep local draft in sync when remote settings change (unless currently editing with unsaved changes)
  useEffect(() => {
    if (paymentSettings) {
      setFormData(paymentSettings);
    }
  }, [paymentSettings]);

  // Handle gateway field update
  const handleGatewayChange = (
    key: 'bkash' | 'nagad' | 'rocket', 
    field: keyof MfsGatewayConfig, 
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      gateways: {
        ...prev.gateways,
        [key]: {
          ...prev.gateways[key],
          [field]: value,
        },
      },
    }));

    // Clear error if fixing phone
    if (field === 'accountNumber' && formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Quick toggle gateway active state
  const handleToggleGateway = (key: 'bkash' | 'nagad' | 'rocket') => {
    const currentStatus = formData.gateways[key]?.isActive;
    handleGatewayChange(key, 'isActive', !currentStatus);
  };

  // Copy helper
  const handleCopyNumber = (num: string, key: string) => {
    navigator.clipboard.writeText(num);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    (['bkash', 'nagad', 'rocket'] as const).forEach((key) => {
      const gw = formData.gateways[key];
      if (gw.isActive) {
        const cleanNumber = gw.accountNumber.replace(/\s+/g, '');
        if (!cleanNumber) {
          errors[key] = language === 'bn' ? 'নম্বর প্রদান করা আবশ্যক' : 'Phone number is required when gateway is active';
        } else if (!validateBangladeshiPhone(cleanNumber)) {
          errors[key] = language === 'bn' ? 'সঠিক বাংলাদেশি নম্বর লিখুন (১১ ডিজিট, যেমন 017XXXXXXXX)' : 'Enter valid 11-digit BD number (01XXXXXXXXX)';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Settings to Firestore
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isSuperAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Super Admin Access Required',
        titleBn: 'সুপার অ্যাডমিন এক্সেস আবশ্যক',
        descriptionEn: 'Only the primary Super Admin (mdisrafilh320@gmail.com) is authorized to modify payment settings.',
        descriptionBn: 'পেমেন্ট গেটওয়ে সেটিংস পরিবর্তন করার ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের আছে।',
      });
      return;
    }

    if (!validateForm()) {
      addToast({
        type: 'error',
        titleEn: 'Validation Failed',
        titleBn: 'ফর্ম যাচাইকরণ ব্যর্থ হয়েছে',
        descriptionEn: 'Please correct invalid MFS gateway phone numbers before saving.',
        descriptionBn: 'সংরক্ষণের পূর্বে সঠিক মোবাইল ওয়ালেট নম্বর প্রদান করুন।',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updatePaymentSettings(formData);
    } catch (err) {
      // Error handled in AppContext
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (!isSuperAdmin) {
      addToast({
        type: 'error',
        titleEn: 'Super Admin Access Required',
        titleBn: 'সুপার অ্যাডমিন এক্সেস আবশ্যক',
        descriptionEn: 'Only the Super Admin can reset payment configurations.',
        descriptionBn: 'শুধুমাত্র সুপার অ্যাডমিন সেটিংস রিসেট করতে পারবেন।',
      });
      return;
    }
    if (window.confirm(language === 'bn' ? 'আপনি কি ডিফল্ট পেমেন্ট সেটিংসে ফিরে যেতে চান?' : 'Are you sure you want to reset all payment settings to system defaults?')) {
      setFormData(DEFAULT_PAYMENT_SETTINGS);
      setFormErrors({});
      addToast({
        type: 'info',
        titleEn: 'Reset to Defaults',
        titleBn: 'ডিফল্ট সেটিংস লোড করা হয়েছে',
        descriptionEn: 'Click "Save Changes" to persist default settings to Firestore.',
        descriptionBn: 'ডাটাবেজে ডিফল্ট সেটিংস সংরক্ষণ করতে "Save Changes" বাটনে ক্লিক করুন।',
      });
    }
  };

  const currentPreviewGw = formData.gateways[previewGateway];

  return (
    <div id="admin-payment-settings-tab" className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#12141A] via-[#1A1810] to-[#12141A] border border-[#D4AF37]/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center gap-1.5 uppercase">
              <Sliders className="w-3.5 h-3.5" />
              Dynamic MFS Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Firestore Cloud Synced
            </span>
            {!isSuperAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Read-Only (Super Admin Required)
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            {language === 'bn' ? 'এমএফএস পেমেন্ট গেটওয়ে কন্ট্রোল সেন্টার' : 'MFS Payment Gateway Control Center'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            {language === 'bn' 
              ? 'বিকাশ, নগদ ও রকেট পেমেন্ট নম্বর, একাউন্ট টাইপ (পার্সোনাল/এজেন্ট) এবং সক্রিয়তা পরিচালনা করুন।'
              : 'Dynamically configure bKash, Nagad, and Rocket numbers, account types, and toggle active status. Synced to Firestore in real time.'}
          </p>
          {!isSuperAdmin && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-center gap-2 mt-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {language === 'bn'
                  ? 'সতর্কতা: সাব-অ্যাডমিন/স্টাফ শুধুমাত্র সেটিংস দেখতে পারবেন। পরিবর্তন করার অনুমতি কেবল সুপার অ্যাডমিন (mdisrafilh320@gmail.com)-এর আছে।'
                  : 'Notice: Staff members have read-only visibility. Core payment gateway modifications require Super Admin authentication.'}
              </span>
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={refreshPaymentSettings}
            disabled={isLoadingPaymentSettings}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1E2029] hover:bg-[#282B37] border border-white/10 text-gray-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isLoadingPaymentSettings ? 'animate-spin' : ''}`} />
            {language === 'bn' ? 'রিফ্রেশ' : 'Sync Remote'}
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1E2029] hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-gray-300 hover:text-red-300 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {language === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving || !isSuperAdmin}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 ${
              isSuperAdmin 
                ? 'bg-[#D4AF37] hover:bg-[#C5A028] text-black shadow-[#D4AF37]/25' 
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : !isSuperAdmin ? (
              <Lock className="w-4 h-4 text-neutral-400" />
            ) : (
              <Save className="w-4 h-4 text-black" />
            )}
            <span>
              {!isSuperAdmin 
                ? (language === 'bn' ? 'লকড (সুপার অ্যাডমিন)' : 'Locked (Super Admin Only)')
                : isSaving 
                  ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving to Cloud...') 
                  : (language === 'bn' ? 'সেটিংস সংরক্ষণ করুন' : 'Save All Gateways')}
            </span>
          </button>
        </div>
      </div>

      {/* Master Rules & Global Toggles Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Strict Send Money Only Master Rule */}
        <div className="p-5 rounded-2xl bg-[#12141A] border border-amber-500/30 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {language === 'bn' ? 'সেন্ড মানি স্ট্রিক্ট পলিসি' : 'Strict "Send Money" Policy'}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  Merchant Payment Prevention
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, sendMoneyStrictRule: !prev.sendMoneyStrictRule }))}
              className="text-2xl transition-transform active:scale-95"
            >
              {formData.sendMoneyStrictRule ? (
                <ToggleRight className="w-8 h-8 text-[#D4AF37]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {language === 'bn'
              ? 'সক্রিয় থাকলে গ্রাহকদের সুস্পষ্ট সতর্কতা ব্যানার প্রদর্শিত হবে যাতে কেউ ভুলবশত মার্চেন্ট পেমেন্ট না করে।'
              : 'Enforces high-contrast warning badges on checkout, explicitly instructing customers that merchant payments are disallowed.'}
          </p>
        </div>

        {/* Partial Advance Booking Policy */}
        <div className="p-5 rounded-2xl bg-[#12141A] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {language === 'bn' ? 'পার্শিয়াল অ্যাডভান্স সিস্টেম' : 'Partial Advance Booking'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Standard: Delivery Charge Booking
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, allowPartialAdvance: !prev.allowPartialAdvance }))}
              className="text-2xl transition-transform active:scale-95"
            >
              {formData.allowPartialAdvance ? (
                <ToggleRight className="w-8 h-8 text-[#D4AF37]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-600" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <label className="text-[11px] text-gray-400 shrink-0">
              {language === 'bn' ? 'ডিফল্ট অ্যাডভান্স (BDT):' : 'Fixed Fallback Amount (BDT):'}
            </label>
            <input
              type="number"
              value={formData.partialAdvanceAmount || 200}
              onChange={(e) => setFormData(prev => ({ ...prev, partialAdvanceAmount: Number(e.target.value) || 200 }))}
              className="w-24 bg-[#181A22] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-center focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        {/* Cash on Delivery Master Switch */}
        <div className="p-5 rounded-2xl bg-[#12141A] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  {language === 'bn' ? 'ক্যাশ অন ডেলিভারি (সিওডি)' : 'Cash on Delivery (COD)'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Full Cash upon Delivery
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, allowCod: !prev.allowCod }))}
              className="text-2xl transition-transform active:scale-95"
            >
              {formData.allowCod ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {language === 'bn'
              ? 'সক্রিয় থাকলে গ্রাহকরা সরাসরি সম্পূর্ণ ক্যাশ অন ডেলিভারি অপশনে অর্ডার প্লেস করতে পারবে।'
              : 'Enables customer checkout option to pay 100% upon courier delivery verification.'}
          </p>
        </div>
      </div>

      {/* MFS Gateways Detail Cards (bKash, Nagad, Rocket) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-display font-semibold text-white flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#D4AF37]" />
            {language === 'bn' ? 'মোবাইল ওয়ালেট নম্বর ও কনফিগারেশন' : 'MFS Mobile Wallet Gateways Configuration'}
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {(['bkash', 'nagad', 'rocket'] as const).filter(k => formData.gateways[k]?.isActive).length} of 3 Gateways Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['bkash', 'nagad', 'rocket'] as const).map((mfsKey) => {
            const gw = formData.gateways[mfsKey];
            const hasError = !!formErrors[mfsKey];
            const themeBg = mfsKey === 'bkash' ? '#E2136E' : (mfsKey === 'nagad' ? '#F7941D' : '#8C3494');
            const themeBorder = mfsKey === 'bkash' ? 'border-[#E2136E]/40' : (mfsKey === 'nagad' ? 'border-[#F7941D]/40' : 'border-[#8C3494]/40');

            return (
              <div 
                key={mfsKey}
                className={`p-5 rounded-2xl bg-[#12141A] border ${gw.isActive ? themeBorder : 'border-white/5 opacity-70'} transition-all flex flex-col justify-between space-y-5 relative shadow-xl`}
              >
                {/* Gateway Card Header with Status Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-md"
                        style={{ backgroundColor: themeBg }}
                      >
                        {gw.gatewayName}
                      </span>
                      <span className="text-xs font-mono text-gray-400">
                        {gw.ussdCode}
                      </span>
                    </div>

                    {/* Active/Inactive Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleGateway(mfsKey)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer active:scale-95"
                      style={{
                        backgroundColor: gw.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        borderColor: gw.isActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                        color: gw.isActive ? '#10B981' : '#EF4444',
                      }}
                    >
                      {gw.isActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>ACTIVE</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>INACTIVE</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Warning banner when gateway is inactive */}
                  {!gw.isActive && (
                    <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[11px] text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>
                        {language === 'bn' 
                          ? 'এই গেটওয়ে চেকআউট থেকে সম্পূর্ণ লুকায়িত থাকবে।' 
                          : 'Hidden entirely from customer checkout.'}
                      </span>
                    </div>
                  )}

                  {/* Phone Number Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-300">
                        {language === 'bn' ? `${gw.gatewayName} নম্বর *` : `${gw.gatewayName} Phone Number *`}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(gw.accountNumber, mfsKey)}
                        className="text-[10px] text-gray-400 hover:text-[#D4AF37] flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedKey === mfsKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === mfsKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={gw.accountNumber}
                        onChange={(e) => handleGatewayChange(mfsKey, 'accountNumber', e.target.value.trim())}
                        placeholder="01XXXXXXXXX"
                        className={`w-full bg-[#181A22] border ${
                          hasError ? 'border-red-500 text-red-200' : 'border-white/10 text-white'
                        } rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold tracking-wider placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]`}
                      />
                    </div>
                    {hasError && (
                      <span className="text-[10px] text-red-400 font-mono block">
                        {formErrors[mfsKey]}
                      </span>
                    )}
                  </div>

                  {/* Account Type Selector (Personal / Agent / Merchant) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      {language === 'bn' ? 'অ্যাকাউন্ট টাইপ' : 'Account Classification'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleGatewayChange(mfsKey, 'accountType', 'personal')}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          gw.accountType === 'personal'
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] font-bold'
                            : 'border-white/5 bg-[#181A22] text-gray-400 hover:border-white/15'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Personal (সেন্ড মানি)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGatewayChange(mfsKey, 'accountType', 'agent')}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          gw.accountType === 'agent'
                            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] font-bold'
                            : 'border-white/5 bg-[#181A22] text-gray-400 hover:border-white/15'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Agent (ক্যাশ আউট)</span>
                      </button>
                    </div>
                  </div>

                  {/* Send Money Only Per-Gateway Toggle */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <span className="text-xs text-gray-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      {language === 'bn' ? 'সেন্ড মানি বাধ্যতামূলক' : 'Send Money Only Rule'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGatewayChange(mfsKey, 'sendMoneyOnly', !gw.sendMoneyOnly)}
                      className="text-lg"
                    >
                      {gw.sendMoneyOnly ? (
                        <ToggleRight className="w-6 h-6 text-[#D4AF37]" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Custom Note or Instruction (Optional) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-gray-400">
                      {language === 'bn' ? 'কাস্টমার নোট (বাংলা)' : 'Customer Prompt (English)'}
                    </label>
                    <input
                      type="text"
                      value={language === 'bn' ? gw.notesBn : gw.notesEn}
                      onChange={(e) => {
                        if (language === 'bn') {
                          handleGatewayChange(mfsKey, 'notesBn', e.target.value);
                        } else {
                          handleGatewayChange(mfsKey, 'notesEn', e.target.value);
                        }
                      }}
                      placeholder="e.g. Choose Send Money option from your app"
                      className="w-full bg-[#181A22] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Card Footer Quick Preview Switcher */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-mono">{gw.ussdCode}</span>
                  <button
                    type="button"
                    onClick={() => setPreviewGateway(mfsKey)}
                    className="text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Checkout</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Customer Checkout Simulation Preview Box */}
      <div className="p-6 rounded-2xl bg-[#0F1015] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'bn' ? 'লাইভ কাস্টমার চেকআউট প্রিভিউ' : 'Live Customer Checkout Rendering Simulation'}
              </h4>
              <p className="text-xs text-gray-400">
                {language === 'bn'
                  ? 'গ্রাহকরা চেকআউট পেজে যেভাবে দেখতে পাবেন (রিয়েল-টাইম প্রেভিউ)'
                  : 'Instant preview of how the customer sees your active wallet details during checkout.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(['bkash', 'nagad', 'rocket'] as const).map((mfsKey) => {
              const isSelected = previewGateway === mfsKey;
              const isGwActive = formData.gateways[mfsKey]?.isActive;
              return (
                <button
                  type="button"
                  key={mfsKey}
                  onClick={() => setPreviewGateway(mfsKey)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : isGwActive
                      ? 'bg-[#181A22] text-gray-300 hover:bg-[#222430]'
                      : 'bg-red-950/20 text-red-400 line-through opacity-60'
                  }`}
                >
                  {mfsKey} {isGwActive ? '' : '(OFF)'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Render Customer View Mock */}
        <div className="p-5 rounded-xl bg-[#14151D] border border-[#2A2A36] space-y-4">
          {!currentPreviewGw?.isActive ? (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-center text-xs text-red-300">
              {language === 'bn'
                ? `🚫 ${currentPreviewGw?.gatewayName || previewGateway} বর্তমানে নিষ্ক্রিয়। চেকআউট পেজে এটি প্রদর্শিত হবে না।`
                : `🚫 ${currentPreviewGw?.gatewayName || previewGateway} is currently INACTIVE. It is completely hidden from customer checkout.`}
            </div>
          ) : (
            <>
              {/* Send Money Strict Rule Warning */}
              {(formData.sendMoneyStrictRule || currentPreviewGw.sendMoneyOnly) && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#1E1A14] to-amber-500/10 border-2 border-amber-500/40 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-300 block">
                      Strictly Send Money (সেন্ড মানি) only. Merchant Payments are not supported.
                    </span>
                    <p className="text-[11px] text-amber-200/80">
                      {language === 'bn'
                        ? 'মার্চেন্ট পেমেন্ট বা বিল পে করবেন না। শুধুমাত্র "সেন্ড মানি" অপশন ব্যবহার করুন।'
                        : 'Please use "Send Money" only. Merchant "Make Payment" transactions cannot be verified automatically.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Number Card */}
              <div className="p-4 rounded-xl bg-[#1C1D27] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono text-gray-400">
                      Luxora BD Official {currentPreviewGw.gatewayName}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-semibold uppercase font-mono">
                      {currentPreviewGw.accountType}
                    </span>
                  </div>
                  <span className="text-lg font-mono font-bold text-white tracking-wider block">
                    {currentPreviewGw.accountNumber || '01XXXXXXXXX'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyNumber(currentPreviewGw.accountNumber, 'preview')}
                  className="px-4 py-2 rounded-xl gold-bg text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:brightness-110"
                >
                  {copiedKey === 'preview' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'preview' ? 'Copied!' : 'Copy Number'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Audit Log Timestamp & Save Footer */}
      <div className="p-4 rounded-xl bg-[#12141A] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#D4AF37]" />
          <span>
            {formData.updatedAt ? `Last Synced: ${new Date(formData.updatedAt).toLocaleString()}` : 'Ready to synchronize with Firestore Cloud DB'}
            {formData.updatedBy ? ` by ${formData.updatedBy}` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSaveAll()}
          disabled={isSaving}
          className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-black text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : (language === 'bn' ? 'সকল পরিবর্তন সংরক্ষণ করুন' : 'Save All Changes')}</span>
        </button>
      </div>
    </div>
  );
};
