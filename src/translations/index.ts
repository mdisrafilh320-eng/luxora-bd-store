import { Language } from '../types';

export const toBengaliNumerals = (num: number | string): string => {
  const bengaliDigits: { [key: string]: string } = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  };
  return num
    .toString()
    .replace(/[0-9]/g, (w) => bengaliDigits[w] || w);
};

export const formatBDT = (amount: number, language: Language = 'en'): string => {
  const formattedEn = new Intl.NumberFormat('en-IN').format(amount);
  if (language === 'bn') {
    return `৳ ${toBengaliNumerals(formattedEn)}`;
  }
  return `৳ ${formattedEn}`;
};

export const translations = {
  en: {
    // Header & Announcement
    announcement: "Luxury Living in Bangladesh • Free Express Delivery on orders above ৳5,000 • Cash on Delivery Available",
    brandName: "LUXORA BD",
    tagline: "Minimalist Luxury Gadgets & Lifestyle",
    navHome: "Home",
    navShop: "All Products",
    navCategories: "Categories",
    navDesignSystem: "Design System Tokens",
    searchPlaceholder: "Search flagship gadgets, audio, wearables...",
    quickSearchHint: "Press ⌘K or click to search",
    account: "Account",
    signIn: "Sign In",
    signOut: "Sign Out",
    welcomeUser: "Welcome",
    myOrders: "My Orders",
    vipStatus: "VIP Status",

    // Categories
    catAll: "All Collections",
    catAudio: "Hi-Fi Audio",
    catWearables: "Smart Wearables",
    catDeskCharging: "Desk & Power",
    catApple: "Apple Ecosystem",
    catPhotography: "Creator & Camera",
    catLifestyle: "Luxury Lifestyle",

    // Hero Section
    heroBadge: "CURATED FLAGSHIP 2026",
    heroTitlePrefix: "PRECISION",
    heroTitleAccent: "ELEGANCE",
    heroTitleSuffix: "IN EVERY DETAIL.",
    heroSubtitle: "Handpicked flagship electronics and timeless lifestyle artifacts, engineered for high-performance individuals in Bangladesh.",
    heroCtaPrimary: "Explore Collection",
    heroCtaSecondary: "Inspect Design System",
    heroTrustStat1: "100% Authentic",
    heroTrustStat1Sub: "Official Distributor Warranties",
    heroTrustStat2: "24-48 Hours",
    heroTrustStat2Sub: "Express Dhaka & Nationwide Delivery",
    heroTrustStat3: "Cash on Delivery",
    heroTrustStat3Sub: "Inspect Before Payment",

    // Trust Badges
    trust1Title: "100% Original Products",
    trust1Desc: "Sourced directly from verified global brands with serial authentication.",
    trust2Title: "Cash on Delivery (COD)",
    trust2Desc: "Pay with confidence upon doorstep delivery across all 64 districts in Bangladesh.",
    trust3Title: "24-48h Express Shipping",
    trust3Desc: "Same-day dispatch in Dhaka metropolitan, rapid nationwide courier.",
    trust4Title: "7-Day Hassle-Free Returns",
    trust4Desc: "Direct replacement or prompt refund backed by our official warranty guarantee.",

    // Section Titles
    featuredTitle: "FLAGSHIP SHOWCASE",
    featuredSubtitle: "Engineered for connoisseurs of precision design and acoustic excellence.",
    allProductsTitle: "CURATED CATALOG",
    allProductsSubtitle: "Explore our verified collection with live currency calculation and stock status.",

    // Product Card & Details
    addToCart: "Add to Cart",
    buyNow: "Buy Now",
    quickView: "Quick View",
    inStock: "In Stock",
    outOfStock: "Sold Out",
    onlyFewLeft: "Only {count} units remaining",
    officialWarranty: "Official Warranty",
    productDetails: "Product Specifications",
    customerReviews: "Customer Reviews",
    addedToCartTitle: "Added to Cart",
    addedToCartDesc: "{product} has been added to your luxury bag.",
    wishlistAdded: "Added to Wishlist",
    wishlistRemoved: "Removed from Wishlist",

    // Cart Drawer
    cartTitle: "Your Luxury Bag",
    cartEmpty: "Your bag is currently empty",
    cartEmptyDesc: "Explore our collection of fine tech and add items to your personal selection.",
    continueShopping: "Continue Shopping",
    subtotal: "Subtotal",
    deliveryFee: "Delivery Fee",
    freeDelivery: "FREE",
    freeDeliveryUnlocked: "You have unlocked Free Express Delivery!",
    freeDeliveryAway: "Add {amount} more to unlock Free Nationwide Delivery",
    checkoutWithCOD: "Order with Cash on Delivery",
    orPayWith: "Or secure online payment via",
    items: "items",
    item: "item",
    clearCart: "Clear Bag",

    // Wishlist Drawer
    wishlistTitle: "Saved Items",
    wishlistEmpty: "No items saved in wishlist yet",

    // Auth Modal
    authTitle: "Welcome to Luxora Privilege",
    authSubtitle: "Access tailored concierge support, tracked warranties, and exclusive member discounts.",
    phoneEmailLabel: "Phone Number or Email Address",
    phoneEmailPlaceholder: "+880 17XX-XXXXXX or name@example.com",
    continueBtn: "Continue",
    demoLoginAsVIP: "Quick Demo: Sign in as VIP Client",
    termsNotice: "By continuing, you agree to Luxora BD's Terms of Luxury Service & Privacy Policy.",

    // Filter & Search
    filterAll: "All",
    filterPriceHigh: "Price: High to Low",
    filterPriceLow: "Price: Low to High",
    filterRating: "Highest Rated",
    noProductsFound: "No luxury gadgets match your criteria.",
    resetFilters: "Reset Filters",

    // Footer
    footerAbout: "Luxora BD is Bangladesh's premier destination for authenticated luxury consumer tech, artisanal lifestyle accessories, and minimalist workspace gear.",
    footerSupport: "Client Concierge",
    footerHotline: "01871693050",
    footerEmail: "mdisrafilh320@gmail.com",
    footerAddress: "Bhola Sadar, Bhola, বাংলাদেশ",
    footerHours: "Every day: 10:00 AM - 10:00 PM",
    footerCopyright: "© 2026 LUXORA BD Ltd. All rights reserved. Designed with Minimalist Luxury precision.",
    paymentMethods: "Accepted Payment Options in Bangladesh",

    // Design System Explorer
    dsTitle: "LUXORA BD — Design System & Architectural Tokens",
    dsSubtitle: "Module 1 Specification: Clean, Trustworthy Black & Gold Palette, Bilingual Tokens, & Global State Engine.",
    dsColorPalette: "1. Color Matrix & Luxury Contrast Tokens",
    dsTypography: "2. Typographic Scale & Bilingual Pairing",
    dsButtons: "3. Interactive Luxury Button Hierarchy",
    dsInputs: "4. Form Controls & Focus States",
    dsTrustWidget: "5. Trust & Credibility Components",
    dsStateEngine: "6. Global State Management Monitor",
    viewLiveStore: "Switch to Live Storefront",
    viewDesignSystem: "Open Design System Inspector",
  },
  bn: {
    // Header & Announcement
    announcement: "বিলাসবহুল লাইফস্টাইল ও টেকনোলজি • ৫,০০০ টাকার অর্ডারে ফ্রি এক্সপ্রেস ডেলিভারি • ক্যাশ অন ডেলিভারি সুবিধা",
    brandName: "লাক্সোরা বিডি",
    tagline: "মিনিমালিস্ট লাক্সারি গ্যাজেট ও লাইফস্টাইল",
    navHome: "হোম",
    navShop: "সব পণ্য",
    navCategories: "ক্যাটাগরি",
    navDesignSystem: "ডিজাইন সিস্টেম টোকেন",
    searchPlaceholder: "ফ্ল্যাগশিপ গ্যাজেট, অডিও, ঘড়ি খুঁজুন...",
    quickSearchHint: "খুঁজতে ⌘K চাপুন বা ক্লিক করুন",
    account: "অ্যাকাউন্ট",
    signIn: "সাইন ইন",
    signOut: "লগআউট",
    welcomeUser: "স্বাগতম",
    myOrders: "আমার অর্ডারসমূহ",
    vipStatus: "ভিআইপি স্ট্যাটাস",

    // Categories
    catAll: "সকল কালেকশন",
    catAudio: "হাই-ফাই অডিও",
    catWearables: "স্মার্ট ওয়্যারেবলস",
    catDeskCharging: "ডেস্ক ও পাওয়ার",
    catApple: "অ্যাপল ইকোসিস্টেম",
    catPhotography: "ক্যামেরা ও ক্রিয়েটর",
    catLifestyle: "লাক্সারি লাইফস্টাইল",

    // Hero Section
    heroBadge: "কিউরেটেড ফ্ল্যাগশিপ ২০২৬",
    heroTitlePrefix: "নিখুঁত প্রযুক্তি",
    heroTitleAccent: "আভিজাত্য",
    heroTitleSuffix: "প্রতিটি নিখুঁত অংশে।",
    heroSubtitle: "বাংলাদেশের রুচিশীল গ্যাজেট প্রেমীদের জন্য নির্বাচিত প্রিমিয়াম ইলেকট্রনিক্স ও প্রিমিয়াম লাইফস্টাইল গ্যাজেট কালেকশন।",
    heroCtaPrimary: "কালেকশন দেখুন",
    heroCtaSecondary: "ডিজাইন সিস্টেম টোকেন",
    heroTrustStat1: "১০০% আসল পণ্য",
    heroTrustStat1Sub: "অফিসিয়াল ডিস্ট্রিবিউটর ওয়ারেন্টি",
    heroTrustStat2: "২৪-৪৮ ঘণ্টা",
    heroTrustStat2Sub: "ঢাকা ও দেশব্যাপী দ্রুত ডেলিভারি",
    heroTrustStat3: "ক্যাশ অন ডেলিভারি",
    heroTrustStat3Sub: "পণ্য দেখে নিশ্চিত হয়ে মূল্য পরিশোধ",

    // Trust Badges
    trust1Title: "১০০% অথেনটিক গ্যাজেট",
    trust1Desc: "যাচাইকৃত গ্লোবাল ব্র্যান্ড থেকে সরাসরি সংগৃহীত এবং নিশ্চিত সিরিয়াল নম্বর ট্র্যাকিং।",
    trust2Title: "ক্যাশ অন ডেলিভারি (COD)",
    trust2Desc: "বাংলাদেশের ৬৪ জেলায় কোনো অগ্রিম ঝুঁকি ছাড়া হোম ডেলিভারিতে মূল্য পরিশোধ করুন।",
    trust3Title: "২৪-৪৮ ঘণ্টায় এক্সপ্রেস ডেলিভারি",
    trust3Desc: "ঢাকা সিটিতে সেম-ডে ডেলিভারি এবং সমগ্র বাংলাদেশে দ্রুততম কুরিয়ার নেটওয়ার্ক।",
    trust4Title: "৭ দিনের সহজ রিটার্ন পলিসি",
    trust4Desc: "কোনো সমস্যা দেখা দিলে সহজ রিপ্লেসমেন্ট এবং অফিসিয়াল বিক্রয়োত্তর সেবা।",

    // Section Titles
    featuredTitle: "ফ্ল্যাগশিপ শোকেস",
    featuredSubtitle: "অডিও উৎকর্ষ এবং নিখুঁত ডিজাইন ভালোবাসেন এমন গ্রাহকদের জন্য বিশেষ নির্বাচন।",
    allProductsTitle: "নির্বাচিত ক্যাটালগ",
    allProductsSubtitle: "রিয়েল-টাইম স্টক ও মূল্যসহ আমাদের প্রিমিয়াম পণ্যসম্ভার ঘুরে দেখুন।",

    // Product Card & Details
    addToCart: "ব্যাগে যোগ করুন",
    buyNow: "এখনই কিনুন",
    quickView: "একঝলকে দেখুন",
    inStock: "স্টকে আছে",
    outOfStock: "স্টক শেষ",
    onlyFewLeft: "মাত্র {count}টি অবশিষ্ট আছে",
    officialWarranty: "অফিসিয়াল ওয়ারেন্টি",
    productDetails: "পণ্যের বিস্তারিত স্পেসিফিকেশন",
    customerReviews: "গ্রাহক মতামত",
    addedToCartTitle: "ব্যাগে যোগ হয়েছে",
    addedToCartDesc: "{product} সফলভাবে আপনার শপিং ব্যাগে যুক্ত হয়েছে।",
    wishlistAdded: "উইশলিস্টে সংরক্ষণ করা হয়েছে",
    wishlistRemoved: "উইশলিস্ট থেকে সরানো হয়েছে",

    // Cart Drawer
    cartTitle: "আপনার শপিং ব্যাগ",
    cartEmpty: "আপনার ব্যাগটি বর্তমানে খালি",
    cartEmptyDesc: "আমাদের কিউরেটেড কালেকশন থেকে আপনার পছন্দের গ্যাজেট যোগ করুন।",
    continueShopping: "শপিং চালিয়ে যান",
    subtotal: "সাবটোটাল",
    deliveryFee: "ডেলিভারি চার্জ",
    freeDelivery: "ফ্রি",
    freeDeliveryUnlocked: "আপনি ফ্রি এক্সপ্রেস ডেলিভারি সুবিধা অর্জন করেছেন!",
    freeDeliveryAway: "ফ্রি ডেলিভারি পেতে আর {amount} টাকার পণ্য যোগ করুন",
    checkoutWithCOD: "ক্যাশ অন ডেলিভারিতে অর্ডার করুন",
    orPayWith: "অথবা অনলাইনে নিরাপদ পেমেন্ট করুন",
    items: "টি পণ্য",
    item: "টি পণ্য",
    clearCart: "ব্যাগ খালি করুন",

    // Wishlist Drawer
    wishlistTitle: "সংরক্ষিত পণ্যসমূহ",
    wishlistEmpty: "এখনও কোনো পণ্য সেভ করা হয়নি",

    // Auth Modal
    authTitle: "লাক্সোরা প্রিভিলেজে স্বাগতম",
    authSubtitle: "এক্সক্লুসিভ অফার, অফিসিয়াল ওয়ারেন্টি ট্র্যাকিং ও দ্রুত চেকআউটের সুবিধা উপভোগ করুন।",
    phoneEmailLabel: "মোবাইল নম্বর অথবা ইমেইল",
    phoneEmailPlaceholder: "০১৭XX-XXXXXX অথবা নাম@example.com",
    continueBtn: "এগিয়ে যান",
    demoLoginAsVIP: "কুইক ডেমো: ভিআইপি ক্লায়েন্ট হিসেবে সাইন ইন",
    termsNotice: "এগিয়ে যাওয়ার মাধ্যমে আপনি লাক্সোরা বিডি এর টার্মস ও প্রাইভেসি পলিসিতে সম্মতি জানাচ্ছেন।",

    // Filter & Search
    filterAll: "সকল পণ্য",
    filterPriceHigh: "মূল্য: বেশি থেকে কম",
    filterPriceLow: "মূল্য: কম থেকে বেশি",
    filterRating: "সেরা রেটিং",
    noProductsFound: "আপনার অনুসন্ধানের সাথে মিলে এমন কোনো গ্যাজেট পাওয়া যায়নি।",
    resetFilters: "ফিল্টার রিসেট",

    // Footer
    footerAbout: "লাক্সোরা বিডি বাংলাদেশের শীর্ষস্থানীয় অথেনটিক প্রিমিয়াম টেকনোলজি, নিখুঁত লাইফস্টাইল অ্যাক্সেসরিজ এবং ডেস্ক গ্যাজেটের বিশ্বস্ত প্ল্যাটফর্ম।",
    footerSupport: "কাস্টমার কনসিয়ার্জ",
    footerHotline: "০১৮৭১৬৯৩০৫০",
    footerEmail: "mdisrafilh320@gmail.com",
    footerAddress: "ভোলা সদর, ভোলা, বাংলাদেশ",
    footerHours: "প্রতিদিন: সকাল ১০:০০ - রাত ১০:০০",
    footerCopyright: "© ২০২৬ লাক্সোরা বিডি লিমিটেড। সর্বস্বত্ব সংরক্ষিত। মিনিমালিস্ট লাক্সারি আর্কিটেকচারে তৈরি।",
    paymentMethods: "বাংলাদেশে অনুমোদিত পেমেন্ট মাধ্যমসমূহ",

    // Design System Explorer
    dsTitle: "লাক্সোরা বিডি — ডিজাইন সিস্টেম ও আর্কিটেকচারাল টোকেন",
    dsSubtitle: "মডিউল ১ স্পেসিফিকেশন: ক্লীন ও ট্রাস্টওয়ার্দি ব্ল্যাক-গোল্ড প্যালেট, দ্বিভাষিক টোকেন এবং গ্লোবাল স্টেট ইঞ্জিন।",
    dsColorPalette: "১. কালার মেট্রিক্স ও লাক্সারি কনট্রাস্ট টোকেন",
    dsTypography: "২. টাইপোগ্রাফি স্কেল ও দ্বিভাষিক ফন্ট পেয়ারিং",
    dsButtons: "৩. ইন্টারঅ্যাক্টিভ লাক্সারি বাটন হায়ারার্কি",
    dsInputs: "৪. ফর্ম কন্ট্রোল ও ফোকাস স্টেট",
    dsTrustWidget: "৫. ট্রাস্ট ও ক্রেডিবিলিটি উপাদান",
    dsStateEngine: "৬. গ্লোবাল স্টেট ম্যানেজমেন্ট মনিটর",
    viewLiveStore: "লাইভ স্টোরফ্রন্ট দেখুন",
    viewDesignSystem: "ডিজাইন সিস্টেম ইন্সপেক্টর খুলুন",
  },
};
