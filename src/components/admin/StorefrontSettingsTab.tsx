import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  Tag,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadProductImage } from '../../services/storageService';
import {
  addBanner,
  deleteBanner,
  toggleBannerActive,
  addCategory,
  deleteCategory,
  slugifyCategory,
  DEFAULT_RETURN_POLICY,
} from '../../services/storefrontService';
import { ReturnPolicyConfig } from '../../types';

export const StorefrontSettingsTab: React.FC = () => {
  const {
    language,
    banners,
    categories,
    returnPolicy,
    updateReturnPolicy,
    addToast,
  } = useApp();

  // ---------------- 1. BANNER MANAGEMENT STATE ----------------
  const [bannerTitleEn, setBannerTitleEn] = useState('');
  const [bannerTitleBn, setBannerTitleBn] = useState('');
  const [bannerSubtitleEn, setBannerSubtitleEn] = useState('');
  const [bannerSubtitleBn, setBannerSubtitleBn] = useState('');
  const [bannerCtaEn, setBannerCtaEn] = useState('Explore Collection');
  const [bannerTargetCategory, setBannerTargetCategory] = useState('all');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [isUploadingBannerImg, setIsUploadingBannerImg] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [isAddingBanner, setIsAddingBanner] = useState(false);

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBannerImg(true);
    setBannerUploadProgress(15);
    try {
      const result = await uploadProductImage(file, 'banners', (pct) => {
        setBannerUploadProgress(pct);
      });
      setBannerImageUrl(result.url);
      addToast({
        type: 'success',
        titleEn: 'Banner Image Ready',
        titleBn: 'ব্যানার ছবি আপলোড সম্পন্ন',
        descriptionEn: 'Image uploaded and ready to add to hero slider.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Upload Failed',
        titleBn: 'আপলোড ব্যর্থ',
        descriptionEn: err?.message || 'Could not process banner image.',
      });
    } finally {
      setIsUploadingBannerImg(false);
      e.target.value = '';
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageUrl.trim()) {
      addToast({
        type: 'error',
        titleEn: 'Banner Image Required',
        titleBn: 'ব্যানারের ছবি আবশ্যক',
        descriptionEn: 'Please upload a banner image or paste a valid image URL.',
      });
      return;
    }

    setIsAddingBanner(true);
    try {
      await addBanner({
        titleEn: bannerTitleEn,
        titleBn: bannerTitleBn || bannerTitleEn,
        subtitleEn: bannerSubtitleEn,
        subtitleBn: bannerSubtitleBn || bannerSubtitleEn,
        ctaTextEn: bannerCtaEn || 'Explore Collection',
        targetCategory: bannerTargetCategory,
        imageUrl: bannerImageUrl,
        order: banners.length + 1,
        isActive: true,
      });

      setBannerTitleEn('');
      setBannerTitleBn('');
      setBannerSubtitleEn('');
      setBannerSubtitleBn('');
      setBannerImageUrl('');
      setBannerUploadProgress(0);

      addToast({
        type: 'success',
        titleEn: 'Hero Banner Added',
        titleBn: 'নতুন ব্যানার যুক্ত হয়েছে',
        descriptionEn: 'Promotional slide is now live on the home page carousel.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Add Banner',
        titleBn: 'ব্যানার সংরক্ষণ ব্যর্থ',
        descriptionEn: err?.message || 'Could not save banner to Firestore.',
      });
    } finally {
      setIsAddingBanner(false);
    }
  };

  const handleToggleBanner = async (id: string, currentActive: boolean) => {
    try {
      await toggleBannerActive(id, !currentActive);
      addToast({
        type: 'info',
        titleEn: !currentActive ? 'Banner Activated' : 'Banner Hidden',
        titleBn: !currentActive ? 'ব্যানার সক্রিয় করা হয়েছে' : 'ব্যানার লুকানো হয়েছে',
      });
    } catch (err: any) {
      addToast({ type: 'error', titleEn: 'Toggle Failed', titleBn: 'পরিবর্তন ব্যর্থ' });
    }
  };

  const handleRemoveBanner = async (id: string) => {
    try {
      await deleteBanner(id);
      addToast({
        type: 'info',
        titleEn: 'Banner Removed',
        titleBn: 'ব্যানার মুছে ফেলা হয়েছে',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Delete Failed',
        titleBn: 'মুছে ফেলা ব্যর্থ',
        descriptionEn: err?.message,
      });
    }
  };

  // ---------------- 2. CATEGORY MANAGEMENT STATE ----------------
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameEn.trim()) {
      addToast({
        type: 'error',
        titleEn: 'Category Name Required',
        titleBn: 'ক্যাটাগরির নাম আবশ্যক',
        descriptionEn: 'Enter an English category name.',
      });
      return;
    }

    setIsCreatingCategory(true);
    try {
      await addCategory({
        nameEn: newCatNameEn.trim(),
        nameBn: newCatNameBn.trim() || newCatNameEn.trim(),
        order: categories.length + 1,
      });
      setNewCatNameEn('');
      setNewCatNameBn('');
      addToast({
        type: 'success',
        titleEn: 'Category Created',
        titleBn: 'নতুন ক্যাটাগরি তৈরি হয়েছে',
        descriptionEn: 'Now visible on Home Page filter & Product Upload dropdown.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Failed to Create Category',
        titleBn: 'ক্যাটাগরি তৈরি ব্যর্থ',
        descriptionEn: err?.message,
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleRemoveCategory = async (id: string, name: string) => {
    try {
      await deleteCategory(id);
      addToast({
        type: 'info',
        titleEn: 'Category Deleted',
        titleBn: 'ক্যাটাগরি মুছে ফেলা হয়েছে',
        descriptionEn: `Removed "${name}" from storefront taxonomy.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        titleEn: 'Delete Failed',
        titleBn: 'মুছে ফেলা ব্যর্থ',
        descriptionEn: err?.message,
      });
    }
  };

  // ---------------- 3. RETURN POLICY EDITOR STATE ----------------
  const [policyDraft, setPolicyDraft] = useState<ReturnPolicyConfig>(returnPolicy || DEFAULT_RETURN_POLICY);
  const [stepsEnText, setStepsEnText] = useState((returnPolicy?.stepsEn || DEFAULT_RETURN_POLICY.stepsEn).join('\n'));
  const [stepsBnText, setStepsBnText] = useState((returnPolicy?.stepsBn || DEFAULT_RETURN_POLICY.stepsBn).join('\n'));
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    if (returnPolicy) {
      setPolicyDraft(returnPolicy);
      setStepsEnText((returnPolicy.stepsEn || []).join('\n'));
      setStepsBnText((returnPolicy.stepsBn || []).join('\n'));
    }
  }, [returnPolicy]);

  const handleSaveReturnPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    try {
      const stepsEn = stepsEnText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const stepsBn = stepsBnText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await updateReturnPolicy({
        ...policyDraft,
        stepsEn,
        stepsBn: stepsBn.length > 0 ? stepsBn : stepsEn,
      });
    } catch {
      // handled in AppContext
    } finally {
      setIsSavingPolicy(false);
    }
  };

  return (
    <div id="admin-storefront-cms-tab" className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#12141A] border border-[#D4AF37]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Storefront Content Management
          </span>
          <h2 className="text-xl font-semibold text-white">
            {language === 'bn'
              ? 'হিরো ব্যানার, ক্যাটাগরি ও রিটার্ন নীতিমালা'
              : 'Hero Banners, Dynamic Categories & Return Policy'}
          </h2>
          <p className="text-xs text-neutral-400">
            {language === 'bn'
              ? 'যেকোনো পরিবর্তন সাথে সাথে হোম পেজ ও প্রোডাক্ট পেজে লাইভ সিঙ্ক হবে।'
              : 'All updates synchronize immediately with the live storefront carousel, category filter, footer, and product views.'}
          </p>
        </div>
      </div>

      {/* SECTION 1: HERO BANNER MANAGEMENT */}
      <section className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {language === 'bn' ? 'হিরো ব্যানার ম্যানেজমেন্ট (৩.৫ সেকেন্ড স্লাইডার)' : 'Banner Management (Auto-Sliding 3.5s Carousel)'}
              </h3>
              <p className="text-xs text-neutral-400">
                {banners.length} promotional slide{banners.length === 1 ? '' : 's'} registered
              </p>
            </div>
          </div>
        </div>

        {/* Add Banner Form */}
        <form onSubmit={handleCreateBanner} className="p-4 rounded-xl bg-[#0D0F14] border border-neutral-800/80 space-y-4 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Image Upload / Preview */}
            <div className="lg:col-span-4 space-y-2.5">
              <label className="block text-neutral-300 font-semibold">
                {language === 'bn' ? 'ব্যানার ছবি (16:9 সাইজ) *' : 'Promotional Banner Image *'}
              </label>

              <div className="aspect-[16/9] rounded-xl border border-dashed border-neutral-700 bg-[#14161F] overflow-hidden flex flex-col items-center justify-center relative">
                {bannerImageUrl ? (
                  <img src={bannerImageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4 space-y-1 text-neutral-500">
                    <ImageIcon className="w-6 h-6 mx-auto text-[#D4AF37]/70" />
                    <span className="block text-[11px]">Upload 16:9 Promo Image</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 px-3 py-2 rounded-lg bg-[#1A1D28] hover:bg-[#242838] border border-neutral-700 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  {isUploadingBannerImg ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                      <span>{bannerUploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{language === 'bn' ? 'ছবি আপলোড করুন' : 'Upload File'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingBannerImg}
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="text"
                value={bannerImageUrl}
                onChange={(e) => setBannerImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Banner Text & Target */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-neutral-400 mb-1">Headline (English)</label>
                <input
                  type="text"
                  value={bannerTitleEn}
                  onChange={(e) => setBannerTitleEn(e.target.value)}
                  placeholder="e.g. Eid Signature Luxury Collection"
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">শিরোনাম (বাংলা - ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={bannerTitleBn}
                  onChange={(e) => setBannerTitleBn(e.target.value)}
                  placeholder="যেমন: প্রিমিয়াম লাক্সারি কালেকশন"
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Subtitle (English)</label>
                <input
                  type="text"
                  value={bannerSubtitleEn}
                  onChange={(e) => setBannerSubtitleEn(e.target.value)}
                  placeholder="Short promotional highlight..."
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">সাবটাইটেল (বাংলা - ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={bannerSubtitleBn}
                  onChange={(e) => setBannerSubtitleBn(e.target.value)}
                  placeholder="সংক্ষিপ্ত বিবরণ..."
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={bannerCtaEn}
                  onChange={(e) => setBannerCtaEn(e.target.value)}
                  placeholder="Explore Collection"
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Target Category Filter</label>
                <select
                  value={bannerTargetCategory}
                  onChange={(e) => setBannerTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#161822] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.nameEn} ({cat.nameBn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isAddingBanner || isUploadingBannerImg}
                  className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-black font-bold flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isAddingBanner ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{language === 'bn' ? 'নতুন ব্যানার যুক্ত করুন' : 'Add Hero Banner'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Active Banners List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className={`rounded-xl bg-[#0D0F14] border overflow-hidden flex flex-col justify-between ${
                b.isActive ? 'border-neutral-800' : 'border-neutral-800/40 opacity-60'
              }`}
            >
              <div className="relative aspect-[16/9] bg-black">
                <img src={b.imageUrl} alt={b.titleEn || `Banner ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono text-[#D4AF37]">
                  Slide #{idx + 1}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="font-semibold text-white truncate">
                  {b.titleEn || 'Visual Banner Slide'}
                </div>
                <p className="text-[11px] text-neutral-400 truncate">
                  {b.subtitleEn || 'Target: ' + (b.targetCategory || 'all')}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => handleToggleBanner(b.id, b.isActive)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-300 hover:text-[#D4AF37] cursor-pointer"
                  >
                    {b.isActive ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-500" />}
                    <span>{b.isActive ? 'Visible' : 'Hidden'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveBanner(b.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: MANAGE DYNAMIC CATEGORIES */}
      <section className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-4">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {language === 'bn' ? 'ক্যাটাগরি ম্যানেজমেন্ট' : 'Manage Categories'}
            </h3>
            <p className="text-xs text-neutral-400">
              {language === 'bn'
                ? 'ক্যাটাগরি তৈরি বা মুছে ফেলুন (যেমন: Free Delivery, Gadgets, Fashion, Luxury)'
                : 'Dynamically create or delete categories synced with the home page filter and product upload dropdown.'}
            </p>
          </div>
        </div>

        {/* Create Category Form */}
        <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs">
          <div className="sm:col-span-5">
            <label className="block text-neutral-400 mb-1">Category Name (English) *</label>
            <input
              type="text"
              required
              value={newCatNameEn}
              onChange={(e) => setNewCatNameEn(e.target.value)}
              placeholder="e.g. Gadgets, Fashion, Luxury"
              className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-neutral-400 mb-1">ক্যাটাগরির নাম (বাংলা - ঐচ্ছিক)</label>
            <input
              type="text"
              value={newCatNameBn}
              onChange={(e) => setNewCatNameBn(e.target.value)}
              placeholder="যেমন: গ্যাজেটস, ফ্যাশন, লাক্সারি"
              className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isCreatingCategory}
              className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] text-black font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isCreatingCategory ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add</span>
            </button>
          </div>
        </form>

        {newCatNameEn.trim() && (
          <p className="text-[11px] font-mono text-neutral-400">
            Generated Slug: <span className="text-[#D4AF37]">{slugifyCategory(newCatNameEn)}</span>
          </p>
        )}

        {/* Categories List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-3.5 rounded-xl bg-[#0D0F14] border border-neutral-800 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{cat.nameEn}</div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {cat.nameBn} · <span className="font-mono text-neutral-500">{cat.slug}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveCategory(cat.id, cat.nameEn)}
                className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: EDITABLE RETURN POLICY */}
      <section className="p-6 rounded-2xl bg-[#12141A] border border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {language === 'bn' ? '৭ দিনের রিটার্ন নীতিমালা এডিটর' : 'Return Policy Editor (Storewide)'}
              </h3>
              <p className="text-xs text-neutral-400">
                {language === 'bn'
                  ? 'ফুটার এবং প্রতিটি প্রোডাক্ট ডিটেইলস পেজে প্রদর্শিত রিটার্ন নীতি ও নির্দেশনা আপডেট করুন।'
                  : 'Edit custom 7-day return policy & step-by-step instructions shown in Footer & every Product Details view.'}
              </p>
            </div>
          </div>
          {returnPolicy.updatedAt && (
            <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced
            </span>
          )}
        </div>

        <form onSubmit={handleSaveReturnPolicy} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">Policy Title (English)</label>
              <input
                type="text"
                required
                value={policyDraft.titleEn}
                onChange={(e) => setPolicyDraft({ ...policyDraft, titleEn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">নীতিমালা শিরোনাম (বাংলা)</label>
              <input
                type="text"
                required
                value={policyDraft.titleBn}
                onChange={(e) => setPolicyDraft({ ...policyDraft, titleBn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">Policy Overview (English)</label>
              <textarea
                rows={3}
                required
                value={policyDraft.summaryEn}
                onChange={(e) => setPolicyDraft({ ...policyDraft, summaryEn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">নীতিমালা সারসংক্ষেপ (বাংলা)</label>
              <textarea
                rows={3}
                required
                value={policyDraft.summaryBn}
                onChange={(e) => setPolicyDraft({ ...policyDraft, summaryBn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">
                Step-by-Step Return Instructions (English — 1 step per line)
              </label>
              <textarea
                rows={5}
                required
                value={stepsEnText}
                onChange={(e) => setStepsEnText(e.target.value)}
                placeholder="Enter each step on a new line..."
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">
                ধাপে ধাপে রিটার্ন নির্দেশনা (বাংলা — প্রতি লাইনে ১টি ধাপ)
              </label>
              <textarea
                rows={5}
                required
                value={stepsBnText}
                onChange={(e) => setStepsBnText(e.target.value)}
                placeholder="প্রতি লাইনে একটি করে ধাপ লিখুন..."
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">Conditions / Eligibility Note (English)</label>
              <input
                type="text"
                value={policyDraft.eligibilityNotesEn || ''}
                onChange={(e) => setPolicyDraft({ ...policyDraft, eligibilityNotesEn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">শর্তাবলী নোট (বাংলা)</label>
              <input
                type="text"
                value={policyDraft.eligibilityNotesBn || ''}
                onChange={(e) => setPolicyDraft({ ...policyDraft, eligibilityNotesBn: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#161822] border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-neutral-800">
            <button
              type="submit"
              disabled={isSavingPolicy}
              className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:opacity-50 text-black font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-[#D4AF37]/20"
            >
              {isSavingPolicy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSavingPolicy ? 'Saving Policy...' : (language === 'bn' ? 'রিটার্ন নীতিমালা সংরক্ষণ করুন' : 'Save Return Policy')}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
