import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CategoryItem, HeroBannerItem, ReturnPolicyConfig } from '../types';
import heroBannerAudio from '../assets/images/hero_banner_audio_1794561216709.jpg';
import heroBannerWearables from '../assets/images/hero_banner_wearables_1794561217318.jpg';
import heroBannerEssentials from '../assets/images/hero_banner_essentials_1794561216626.jpg';

export const BANNERS_COLLECTION = 'banners';
export const CATEGORIES_COLLECTION = 'categories';
export const RETURN_POLICY_DOC_PATH = ['settings', 'return_policy'] as const;
export const STOREFRONT_META_DOC_PATH = ['settings', 'storefront_meta'] as const;

const CACHE_BANNERS_KEY = 'luxora_cached_banners';
const CACHE_CATEGORIES_KEY = 'luxora_cached_categories';
const CACHE_RETURN_POLICY_KEY = 'luxora_cached_return_policy';

export const DEFAULT_HERO_BANNERS: HeroBannerItem[] = [
  {
    id: 'banner-flagship-acoustics',
    titleEn: 'Acoustic Precision, Refined.',
    titleBn: 'শব্দশিল্পের অনন্য আভিজাত্য',
    subtitleEn: 'Flagship noise-canceling headphones curated for studio clarity across Bangladesh.',
    subtitleBn: 'অরিজিনাল ফ্ল্যাগশিপ হেডফোন এবং সাউন্ড সিস্টেম — অফিসিয়াল ওয়ারেন্টি ও ফাস্ট ডেলিভারি।',
    ctaTextEn: 'Explore Audio',
    ctaTextBn: 'অডিও দেখুন',
    targetCategory: 'audio',
    imageUrl: heroBannerAudio,
    order: 1,
    isActive: true,
  },
  {
    id: 'banner-titanium-wearables',
    titleEn: 'Architectural Titanium Craft',
    titleBn: 'টাইটানিয়াম স্মার্টওয়াচ কালেকশন',
    subtitleEn: 'Sapphire crystal wearables engineered for effortless performance.',
    subtitleBn: 'স্যামসাং, অ্যাপল ও গার্মিনের এক্সক্লুসিভ স্মার্টওয়াচ — সারাদেশে এক্সপ্রেস ডেলিভারি।',
    ctaTextEn: 'Shop Wearables',
    ctaTextBn: 'ওয়াচ দেখুন',
    targetCategory: 'wearables',
    imageUrl: heroBannerWearables,
    order: 2,
    isActive: true,
  },
  {
    id: 'banner-luxury-essentials',
    titleEn: 'Signature Everyday Essentials',
    titleBn: 'প্রিমিয়াম লাইফস্টাইল ও গ্যাজেট',
    subtitleEn: 'Verified authentic power systems, luxury accessories, and official 7-day returns.',
    subtitleBn: '১০০% অথেনটিক পাওয়ার ব্যাংক ও টেক এক্সেসরিজ — ৭ দিনের সহজ রিটার্ন সুবিধা।',
    ctaTextEn: 'View Catalog',
    ctaTextBn: 'সব পণ্য দেখুন',
    targetCategory: 'all',
    imageUrl: heroBannerEssentials,
    order: 3,
    isActive: true,
  },
];

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'free-delivery', slug: 'free-delivery', nameEn: 'Free Delivery', nameBn: 'ফ্রি ডেলিভারি', order: 1, isActive: true },
  { id: 'gadgets', slug: 'gadgets', nameEn: 'Gadgets', nameBn: 'গ্যাজেটস', order: 2, isActive: true },
  { id: 'fashion', slug: 'fashion', nameEn: 'Fashion', nameBn: 'ফ্যাশন', order: 3, isActive: true },
  { id: 'luxury', slug: 'luxury', nameEn: 'Luxury', nameBn: 'লাক্সারি', order: 4, isActive: true },
  { id: 'audio', slug: 'audio', nameEn: 'Audio', nameBn: 'অডিও', order: 5, isActive: true },
  { id: 'wearables', slug: 'wearables', nameEn: 'Wearables', nameBn: 'স্মার্টওয়াচ', order: 6, isActive: true },
  { id: 'desk-charging', slug: 'desk-charging', nameEn: 'Desk & Power', nameBn: 'ডেস্ক ও পাওয়ার', order: 7, isActive: true },
];

export const DEFAULT_RETURN_POLICY: ReturnPolicyConfig = {
  titleEn: '7-Day Hassle-Free Return & Replacement Policy',
  titleBn: '৭ দিনের সহজ রিটার্ন ও রিপ্লেসমেন্ট নীতিমালা',
  summaryEn:
    'Every Luxora BD order is covered by our 7-day inspection and return guarantee from the date of delivery. If your item arrives damaged, defective, or different from specification, we arrange prompt replacement or resolution nationwide.',
  summaryBn:
    'লাক্সোরা বিডি-র প্রতিটি অর্ডারে ডেলিভারির তারিখ থেকে ৭ দিনের রিটার্ন ও রিপ্লেসমেন্ট সুবিধা রয়েছে। পণ্যে কোনো উৎপাদনগত ত্রুটি, ড্যামেজ বা বিবরণের সাথে অমিল থাকলে সারাদেশে দ্রুত রিপ্লেসমেন্ট বা সমাধান দেওয়া হয়।',
  stepsEn: [
    'Record a quick unboxing video when opening the courier parcel for faster verification.',
    'Keep the product unused with original box, seal, warranty card, and invoice intact within 7 days.',
    'Contact Luxora BD Support on WhatsApp/Hotline (01871-693050) with your Order ID and issue photo/video.',
    'Our concierge schedules doorstep courier pickup across all 64 districts and dispatches your replacement or refund.',
  ],
  stepsBn: [
    'দ্রুত যাচাইয়ের জন্য পার্সেল খোলার সময় একটি সংক্ষিপ্ত আনবক্সিং ভিডিও ধারণ করুন।',
    'ডেলিভারির ৭ দিনের মধ্যে পণ্যটি অব্যবহৃত অবস্থায় মূল বক্স, সিল, ওয়ারেন্টি কার্ড ও ইনভয়েসসহ সংরক্ষণ করুন।',
    'আপনার অর্ডার আইডি ও পণ্যের ছবি/ভিডিওসহ আমাদের সাপোর্ট হটলাইন (01871-693050)-এ যোগাযোগ করুন।',
    'আমাদের টিম ৬৪ জেলায় ডোরস্টেপ কুরিয়ার পিকআপের মাধ্যমে দ্রুত রিপ্লেসমেন্ট বা রিফান্ড নিশ্চিত করবে।',
  ],
  eligibilityNotesEn:
    'Physical burn, liquid damage after delivery, or missing accessories voids return eligibility.',
  eligibilityNotesBn:
    'ডেলিভারির পর বাহ্যিক আঘাত, পানি বা পোড়া দাগ এবং মূল এক্সেসরিজ না থাকলে রিটার্ন প্রযোজ্য হবে না।',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function setLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function slugifyCategory(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return base || `cat-${Date.now().toString(36)}`;
}

// ==========================================
// 1. HERO BANNERS MANAGEMENT
// ==========================================

let bannersSeedChecked = false;
export async function ensureInitialBannersSeeded(): Promise<void> {
  if (bannersSeedChecked) return;
  bannersSeedChecked = true;
  try {
    const metaRef = doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]);
    const metaSnap = await getDoc(metaRef);
    const metaData = metaSnap.exists() ? metaSnap.data() : {};
    if (metaData?.bannersSeeded) return;

    const existing = await getDocs(collection(db, BANNERS_COLLECTION));
    if (existing.empty) {
      const now = new Date().toISOString();
      await Promise.all(
        DEFAULT_HERO_BANNERS.map((b) =>
          setDoc(doc(db, BANNERS_COLLECTION, b.id), { ...b, createdAt: now, updatedAt: now })
        )
      );
    }
    await setDoc(metaRef, { bannersSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Banner initial seed notice:', err);
  }
}

export function getCachedBanners(): HeroBannerItem[] {
  return getLocalCache<HeroBannerItem[]>(CACHE_BANNERS_KEY, DEFAULT_HERO_BANNERS);
}

export function subscribeToBanners(
  onUpdate: (banners: HeroBannerItem[]) => void
): Unsubscribe {
  ensureInitialBannersSeeded().catch(() => {});
  try {
    return onSnapshot(
      collection(db, BANNERS_COLLECTION),
      (snapshot) => {
        const list: HeroBannerItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as HeroBannerItem;
          list.push({ ...data, id: data?.id || d.id });
        });
        list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setLocalCache(CACHE_BANNERS_KEY, list);
        onUpdate(list);
      },
      (err) => {
        console.warn('Banner subscription fallback:', err);
        onUpdate(getCachedBanners());
      }
    );
  } catch {
    return () => {};
  }
}

export async function addBanner(banner: Partial<HeroBannerItem>): Promise<HeroBannerItem> {
  const now = new Date().toISOString();
  const cleanId = (banner.id || `banner-${Date.now().toString(36)}`).replace(/[^a-zA-Z0-9_.@-]/g, '_');
  if (!banner.imageUrl?.trim()) {
    throw new Error('Banner image is required.');
  }
  const payload: HeroBannerItem = {
    id: cleanId,
    titleEn: (banner.titleEn || '').trim(),
    titleBn: (banner.titleBn || '').trim(),
    subtitleEn: (banner.subtitleEn || '').trim(),
    subtitleBn: (banner.subtitleBn || '').trim(),
    ctaTextEn: (banner.ctaTextEn || '').trim() || 'Shop Collection',
    ctaTextBn: (banner.ctaTextBn || '').trim() || 'সংগ্রহ দেখুন',
    targetCategory: (banner.targetCategory || 'all').trim(),
    imageUrl: banner.imageUrl.trim(),
    order: Number(banner.order) || Date.now(),
    isActive: banner.isActive !== false,
    createdAt: banner.createdAt || now,
    updatedAt: now,
  };
  try {
    await setDoc(doc(db, BANNERS_COLLECTION, cleanId), payload);
    await setDoc(
      doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]),
      { bannersSeeded: true, updatedAt: now },
      { merge: true }
    );
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${BANNERS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

export async function toggleBannerActive(bannerId: string, isActive: boolean): Promise<void> {
  const cleanId = bannerId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
  try {
    await setDoc(
      doc(db, BANNERS_COLLECTION, cleanId),
      { isActive, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BANNERS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

export async function deleteBanner(bannerId: string): Promise<void> {
  const cleanId = bannerId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
  try {
    await deleteDoc(doc(db, BANNERS_COLLECTION, cleanId));
    await setDoc(
      doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]),
      { bannersSeeded: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BANNERS_COLLECTION}/${cleanId}`);
    throw error;
  }
}

// ==========================================
// 2. DYNAMIC CATEGORIES MANAGEMENT
// ==========================================

let categoriesSeedChecked = false;
export async function ensureInitialCategoriesSeeded(): Promise<void> {
  if (categoriesSeedChecked) return;
  categoriesSeedChecked = true;
  try {
    const metaRef = doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]);
    const metaSnap = await getDoc(metaRef);
    const metaData = metaSnap.exists() ? metaSnap.data() : {};
    if (metaData?.categoriesSeeded) return;

    const existing = await getDocs(collection(db, CATEGORIES_COLLECTION));
    if (existing.empty) {
      await Promise.all(
        DEFAULT_CATEGORIES.map((c) => setDoc(doc(db, CATEGORIES_COLLECTION, c.id), c))
      );
    }
    await setDoc(metaRef, { categoriesSeeded: true, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Category initial seed notice:', err);
  }
}

export function getCachedCategories(): CategoryItem[] {
  return getLocalCache<CategoryItem[]>(CACHE_CATEGORIES_KEY, DEFAULT_CATEGORIES);
}

export function subscribeToCategories(
  onUpdate: (categories: CategoryItem[]) => void
): Unsubscribe {
  ensureInitialCategoriesSeeded().catch(() => {});
  try {
    return onSnapshot(
      collection(db, CATEGORIES_COLLECTION),
      (snapshot) => {
        const list: CategoryItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as CategoryItem;
          list.push({ ...data, id: data?.id || d.id, slug: data?.slug || d.id });
        });
        list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setLocalCache(CACHE_CATEGORIES_KEY, list);
        onUpdate(list);
      },
      (err) => {
        console.warn('Category subscription fallback:', err);
        onUpdate(getCachedCategories());
      }
    );
  } catch {
    return () => {};
  }
}

export async function addCategory(input: {
  nameEn: string;
  nameBn?: string;
  slug?: string;
  order?: number;
}): Promise<CategoryItem> {
  const cleanNameEn = input.nameEn.trim();
  if (!cleanNameEn) {
    throw new Error('Category name is required.');
  }
  const slug = slugifyCategory(input.slug?.trim() || cleanNameEn);
  const payload: CategoryItem = {
    id: slug,
    slug,
    nameEn: cleanNameEn,
    nameBn: (input.nameBn || '').trim() || cleanNameEn,
    order: Number(input.order) || Date.now(),
    isActive: true,
  };
  try {
    await setDoc(doc(db, CATEGORIES_COLLECTION, slug), payload);
    await setDoc(
      doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]),
      { categoriesSeeded: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${CATEGORIES_COLLECTION}/${slug}`);
    throw error;
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const cleanId = categoryId.replace(/[^a-zA-Z0-9_.@-]/g, '_');
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, cleanId));
    await setDoc(
      doc(db, STOREFRONT_META_DOC_PATH[0], STOREFRONT_META_DOC_PATH[1]),
      { categoriesSeeded: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATEGORIES_COLLECTION}/${cleanId}`);
    throw error;
  }
}

// ==========================================
// 3. EDITABLE RETURN POLICY
// ==========================================

export function getCachedReturnPolicy(): ReturnPolicyConfig {
  return getLocalCache<ReturnPolicyConfig>(CACHE_RETURN_POLICY_KEY, DEFAULT_RETURN_POLICY);
}

export function subscribeToReturnPolicy(
  onUpdate: (policy: ReturnPolicyConfig) => void
): Unsubscribe {
  try {
    const docRef = doc(db, RETURN_POLICY_DOC_PATH[0], RETURN_POLICY_DOC_PATH[1]);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as ReturnPolicyConfig;
          const merged: ReturnPolicyConfig = {
            ...DEFAULT_RETURN_POLICY,
            ...data,
            stepsEn: Array.isArray(data.stepsEn) && data.stepsEn.length > 0 ? data.stepsEn : DEFAULT_RETURN_POLICY.stepsEn,
            stepsBn: Array.isArray(data.stepsBn) && data.stepsBn.length > 0 ? data.stepsBn : DEFAULT_RETURN_POLICY.stepsBn,
          };
          setLocalCache(CACHE_RETURN_POLICY_KEY, merged);
          onUpdate(merged);
        } else {
          onUpdate(getCachedReturnPolicy());
        }
      },
      (err) => {
        console.warn('Return policy subscription fallback:', err);
        onUpdate(getCachedReturnPolicy());
      }
    );
  } catch {
    return () => {};
  }
}

export async function saveReturnPolicy(
  policy: ReturnPolicyConfig,
  updatedBy = 'Admin'
): Promise<ReturnPolicyConfig> {
  const now = new Date().toISOString();
  const payload: ReturnPolicyConfig = {
    titleEn: (policy.titleEn || DEFAULT_RETURN_POLICY.titleEn).trim(),
    titleBn: (policy.titleBn || policy.titleEn || DEFAULT_RETURN_POLICY.titleBn).trim(),
    summaryEn: (policy.summaryEn || DEFAULT_RETURN_POLICY.summaryEn).trim(),
    summaryBn: (policy.summaryBn || policy.summaryEn || DEFAULT_RETURN_POLICY.summaryBn).trim(),
    stepsEn: (policy.stepsEn || []).map((s) => s.trim()).filter(Boolean),
    stepsBn: (policy.stepsBn || []).map((s) => s.trim()).filter(Boolean),
    eligibilityNotesEn: (policy.eligibilityNotesEn || '').trim(),
    eligibilityNotesBn: (policy.eligibilityNotesBn || '').trim(),
    updatedAt: now,
    updatedBy,
  };
  if (payload.stepsEn.length === 0) payload.stepsEn = DEFAULT_RETURN_POLICY.stepsEn;
  if (payload.stepsBn.length === 0) payload.stepsBn = DEFAULT_RETURN_POLICY.stepsBn;

  try {
    await setDoc(doc(db, RETURN_POLICY_DOC_PATH[0], RETURN_POLICY_DOC_PATH[1]), payload);
    setLocalCache(CACHE_RETURN_POLICY_KEY, payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RETURN_POLICY_DOC_PATH[0]}/${RETURN_POLICY_DOC_PATH[1]}`);
    throw error;
  }
}

export const storefrontService = {
  DEFAULT_HERO_BANNERS,
  DEFAULT_CATEGORIES,
  DEFAULT_RETURN_POLICY,
  subscribeToBanners,
  addBanner,
  toggleBannerActive,
  deleteBanner,
  subscribeToCategories,
  addCategory,
  deleteCategory,
  subscribeToReturnPolicy,
  saveReturnPolicy,
};
