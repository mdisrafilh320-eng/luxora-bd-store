import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Heart, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Send, 
  Flame, 
  ArrowRight, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  PackageCheck, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';

interface ReviewItem {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
}

export const ProductDetailModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    language,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setActiveView,
    products,
    t,
    addToast,
    returnPolicy,
    setIsReturnPolicyModalOpen
  } = useApp();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'warranty'>('specs');

  const modalOverlayRef = useRef<HTMLDivElement | null>(null);
  const savedScrollYRef = useRef<number | null>(null);

  // Customer Reviews State
  const [reviews, setReviews] = useState<ReviewItem[]>([
    {
      id: 'rev-1',
      author: 'Farhan Kabir',
      location: 'Gulshan, Dhaka',
      rating: 5,
      date: '3 days ago',
      comment: '100% genuine product. Tested the serial code on the official portal and warranty was verified instantly. Express delivery was super fast!',
      verifiedPurchase: true,
    },
    {
      id: 'rev-2',
      author: 'Shahriar Hossain',
      location: 'Agrabad, Chittagong',
      rating: 5,
      date: '1 week ago',
      comment: 'Premium packaging and craftsmanship. Luxora BD is without a doubt the most reliable luxury gadget source in Bangladesh.',
      verifiedPurchase: true,
    },
  ]);

  // Review Form state
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Touch Swipe for Mobile Gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Preserve background catalog scroll position while modal is open
  useEffect(() => {
    if (quickViewProduct) {
      if (savedScrollYRef.current === null) {
        savedScrollYRef.current = window.scrollY;
      }
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    } else if (savedScrollYRef.current !== null) {
      const targetY = savedScrollYRef.current;
      savedScrollYRef.current = null;
      document.body.style.overflow = '';
      if (Math.abs(window.scrollY - targetY) > 2) {
        window.scrollTo({ top: targetY, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [Boolean(quickViewProduct)]);

  // Close cleanly on Escape key
  useEffect(() => {
    if (!quickViewProduct) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct, setQuickViewProduct]);

  // Reset image, selected variant/color, and quantity whenever switching products
  useEffect(() => {
    if (quickViewProduct) {
      setSelectedImageIndex(0);
      setSelectedColor(quickViewProduct.colors?.[0]?.name);
      const firstVariant = quickViewProduct.sizes?.[0] || quickViewProduct.variants?.[0];
      setSelectedVariant(firstVariant);
      setQuantity(1);
      setActiveTab('specs');
      if (modalOverlayRef.current) {
        modalOverlayRef.current.scrollTop = 0;
      }
    }
  }, [quickViewProduct?.id]);

  // Combine main image and gallery seamlessly without duplicates
  const galleryImages = useMemo(() => {
    if (!quickViewProduct) return [];
    const combined = [
      quickViewProduct.image,
      ...(Array.isArray(quickViewProduct.gallery) ? quickViewProduct.gallery : []),
    ]
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);

    const unique = Array.from(new Set(combined));
    return unique.length > 0
      ? unique
      : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'];
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWishlisted = isInWishlist(product.id);
  const isOutOfStock = !product.inStock || product.stockCount <= 0;

  // Bilingual titles, taglines, and descriptions
  const primaryTitle = language === 'bn' ? (product.nameBn || product.nameEn) : (product.nameEn || product.nameBn);
  const secondaryTitle = language === 'bn' ? product.nameEn : product.nameBn;
  const hasSecondaryTitle = Boolean(secondaryTitle && secondaryTitle.trim() && secondaryTitle.trim() !== primaryTitle.trim());

  const primaryTagline = language === 'bn' ? (product.taglineBn || product.taglineEn) : (product.taglineEn || product.taglineBn);
  const secondaryTagline = language === 'bn' ? product.taglineEn : product.taglineBn;
  const hasSecondaryTagline = Boolean(secondaryTagline && secondaryTagline.trim() && secondaryTagline.trim() !== primaryTagline.trim());

  const primaryDescription = language === 'bn'
    ? (product.descriptionBn || product.descriptionEn)
    : (product.descriptionEn || product.descriptionBn);
  const secondaryDescription = language === 'bn' ? product.descriptionEn : product.descriptionBn;
  const hasSecondaryDescription = Boolean(
    secondaryDescription &&
    secondaryDescription.trim() &&
    secondaryDescription.trim() !== primaryDescription.trim()
  );

  const warranty = language === 'bn' ? (product.warrantyBn || product.warrantyEn) : (product.warrantyEn || product.warrantyBn);

  const sizeOrVariantList: string[] = [
    ...(Array.isArray(product.sizes) ? product.sizes : []),
    ...(Array.isArray(product.variants) ? product.variants : []),
  ].filter(Boolean);

  const activeImage = galleryImages[selectedImageIndex] || galleryImages[0];
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const savings = hasDiscount ? (product.originalPrice! - product.price) : 0;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  const handleCloseModal = () => {
    setQuickViewProduct(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    const swipeThreshold = 50;
    const galleryCount = galleryImages.length || 1;

    if (diff > swipeThreshold) {
      setSelectedImageIndex((prev) => (prev + 1) % galleryCount);
    } else if (diff < -swipeThreshold) {
      setSelectedImageIndex((prev) => (prev - 1 + galleryCount) % galleryCount);
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const buildVariantLabel = () => {
    const parts = [
      selectedColor || product.colors?.[0]?.name,
      selectedVariant || sizeOrVariantList[0],
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : undefined;
  };

  const handleAddToCart = (orderImmediately = false) => {
    if (isOutOfStock) return;
    const variantLabel = buildVariantLabel();
    addToCart(product, quantity, variantLabel);
    if (orderImmediately) {
      // Clear saved scroll lock override when intentionally navigating to checkout
      savedScrollYRef.current = null;
      document.body.style.overflow = '';
      setQuickViewProduct(null);
      setActiveView('checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    setTimeout(() => {
      const newRev: ReviewItem = {
        id: 'rev-' + Date.now(),
        author: newReviewAuthor.trim(),
        location: 'Dhaka, Bangladesh',
        rating: newReviewRating,
        date: 'Just now',
        comment: newReviewComment.trim(),
        verifiedPurchase: true,
      };
      setReviews([newRev, ...reviews]);
      setNewReviewAuthor('');
      setNewReviewComment('');
      setIsSubmittingReview(false);
      addToast({
        type: 'success',
        titleEn: 'Review Submitted',
        titleBn: 'রিভিউ প্রকাশিত হয়েছে',
        descriptionEn: 'Thank you for contributing to the Luxora member community.',
        descriptionBn: 'লাক্সোরা মেম্বার ফিডব্যাকের জন্য আপনাকে ধন্যবাদ।',
      });
    }, 350);
  };

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <AnimatePresence>
      <div
        ref={modalOverlayRef}
        className="fixed inset-0 z-50 overflow-y-auto max-w-full overflow-x-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdp-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseModal}
          className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity"
        />

        <div className="min-h-full flex items-center justify-center p-2 sm:p-5 lg:p-6 text-center max-w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl card-bg border border-[#22222C] rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-10 pb-28 sm:pb-10 text-left shadow-2xl relative overflow-hidden text-[#F3F4F6]"
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#1E1E24]" />

            {/* Top Navigation Strip: Back to Catalog & Close */}
            <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-[#1E1E24]">
              <button
                type="button"
                onClick={handleCloseModal}
                className="min-h-[44px] inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-[#D4AF37] transition-colors py-2 px-3 -ml-2 rounded-xl hover:bg-white/5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'bn' ? 'শপ ক্যাটালগে ফিরে যান' : 'Back to Shop Catalog'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                aria-label="Close product modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main PDP Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
              
              {/* Left Column: Interactive Image Gallery */}
              <div className="md:col-span-6 flex flex-col gap-3.5 sm:gap-4 min-w-0">
                <div
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="aspect-square bg-[#08080B] border border-[#1E1E24] rounded-2xl overflow-hidden relative group select-none"
                >
                  <img
                    src={activeImage}
                    alt={primaryTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Gallery Prev/Next Buttons */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black border border-white/15 text-white flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 hover:bg-black border border-white/15 text-white flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Image Index Indicator */}
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/75 border border-white/10 text-[11px] font-mono text-gray-200 tabular-nums z-10">
                        {selectedImageIndex + 1} / {galleryImages.length}
                      </div>
                    </>
                  )}

                  {/* Promotional / Discount Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {product.badge && (
                      <span className="px-2.5 py-1 rounded-md gold-bg text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                        {product.badge}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="px-2.5 py-1 rounded-md bg-rose-950/95 text-rose-200 border border-rose-500/40 text-[10px] font-bold">
                        -{discountPercent}% · SAVE {formatBDT(savings, language)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gallery Thumbnails Strip */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {galleryImages.map((img, idx) => (
                      <button
                        type="button"
                        key={`${img}-${idx}`}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border overflow-hidden shrink-0 transition-all cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 opacity-100'
                            : 'border-[#1E1E24] opacity-55 hover:opacity-100'
                        }`}
                        aria-label={`View image ${idx + 1}`}
                      >
                        <img
                          src={img}
                          alt={`${primaryTitle} ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Assurance Strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl slate-bg border border-white/5 text-[11px] text-gray-300">
                  <div className="flex flex-col items-center text-center gap-1">
                    <ShieldCheck className="w-4 h-4 gold-text shrink-0" />
                    <span className="font-semibold text-white">100% Authentic</span>
                    <span className="text-[10px] text-gray-500">Official Warranty</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 border-x border-white/5 px-1.5 sm:px-2">
                    <Truck className="w-4 h-4 gold-text shrink-0" />
                    <span className="font-semibold text-white">64 Districts</span>
                    <span className="text-[10px] text-gray-500">Flat Rate</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReturnPolicyModalOpen(true)}
                    className="flex flex-col items-center justify-center text-center gap-1 cursor-pointer group hover:text-[#D4AF37] transition-colors min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 gold-text shrink-0" />
                    <span className="font-semibold text-white group-hover:text-[#D4AF37] underline decoration-[#D4AF37]/40 underline-offset-4">
                      {language === 'bn' ? '৭ দিন রিটার্ন' : '7-Day Return'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {language === 'bn' ? 'নীতিমালা দেখুন' : 'View Policy'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Column: Full Details, Pricing, Variants, and Direct Purchase Actions */}
              <div className="md:col-span-6 flex flex-col justify-between min-w-0">
                <div>
                  {/* Metadata Line: Brand · Category · Live Stock Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-400">
                      <span className="uppercase tracking-[0.2em] font-bold gold-text">
                        {product.brand}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize text-gray-400">{product.category.replace('-', ' ')}</span>
                    </div>

                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}</span>
                      </span>
                    ) : product.stockCount <= 8 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {language === 'bn'
                            ? `স্টকে আছে · মাত্র ${product.stockCount}টি বাকি`
                            : `Low Stock · Only ${product.stockCount} left`}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>
                          {language === 'bn'
                            ? `স্টকে আছে (${product.stockCount}টি উপলব্ধ)`
                            : `In Stock (${product.stockCount} available)`}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Full Bilingual Product Titles */}
                  <div className="space-y-1 mb-3">
                    <h1 id="pdp-modal-title" className="text-2xl sm:text-3xl font-bold font-sans text-white leading-tight">
                      {primaryTitle}
                    </h1>
                    {hasSecondaryTitle && (
                      <p className="text-sm sm:text-base font-medium text-[#D4AF37]/85 font-sans">
                        {secondaryTitle}
                      </p>
                    )}
                  </div>

                  {/* Full Taglines */}
                  {(primaryTagline || hasSecondaryTagline) && (
                    <div className="space-y-0.5 mb-3">
                      {primaryTagline && (
                        <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed">
                          {primaryTagline}
                        </p>
                      )}
                      {hasSecondaryTagline && (
                        <p className="text-xs text-gray-500 italic leading-relaxed">
                          {secondaryTagline}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Star Rating */}
                  <div className="flex items-center gap-3 pb-4 border-b border-[#1E1E24]">
                    <div className="flex items-center text-[#D4AF37]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-white">{product.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">
                      ({product.reviewsCount} {language === 'bn' ? 'রিভিউ' : 'Verified Reviews'})
                    </span>
                  </div>

                  {/* Price & Original MSRP */}
                  <div className="py-4 flex flex-wrap items-baseline gap-3 sm:gap-4 border-b border-[#1E1E24]">
                    <span className="text-3xl sm:text-4xl font-bold gold-text font-sans">
                      {formatBDT(product.price, language)}
                    </span>
                    {hasDiscount && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs uppercase font-mono text-gray-500">MSRP:</span>
                        <span className="text-base text-gray-500 line-through font-sans">
                          {formatBDT(product.originalPrice!, language)}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 font-mono">
                          ({language === 'bn' ? `সাশ্রয় ${formatBDT(savings, language)}` : `Save ${formatBDT(savings, language)}`})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Full Bilingual Detailed Description & Specifications */}
                  <div className="py-4 space-y-2.5 text-xs sm:text-sm text-gray-200 leading-relaxed font-sans">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] block">
                      {language === 'bn' ? 'প্রোডাক্টের বিস্তারিত বিবরণ ও স্পেসিফিকেশন' : 'Product Description & Specifications'}
                    </span>
                    <p className="whitespace-pre-line">{primaryDescription}</p>
                    {hasSecondaryDescription && (
                      <p className="text-xs text-gray-400 pt-2 border-t border-white/5 whitespace-pre-line">
                        {secondaryDescription}
                      </p>
                    )}
                  </div>

                  {/* Color / Finish Variant Selector */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                        {language === 'bn' ? 'কালার / ফিনিশ:' : 'Color / Finish:'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.colors.map((c) => {
                          const isColorSelected = (selectedColor || product.colors?.[0]?.name) === c.name;
                          return (
                            <button
                              type="button"
                              key={c.name}
                              onClick={() => setSelectedColor(c.name)}
                              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer ${
                                isColorSelected
                                  ? 'slate-bg gold-text border border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/15'
                                  : 'bg-black/50 border border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: c.hex }} />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size / Variant Selector (if available) */}
                  {sizeOrVariantList.length > 0 && (
                    <div className="mb-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">
                        {language === 'bn' ? 'সাইজ / ভ্যারিয়েন্ট:' : 'Size / Variant:'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {sizeOrVariantList.map((variant) => {
                          const isVariantSelected = (selectedVariant || sizeOrVariantList[0]) === variant;
                          return (
                            <button
                              type="button"
                              key={variant}
                              onClick={() => setSelectedVariant(variant)}
                              className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isVariantSelected
                                  ? 'gold-bg text-black font-bold shadow-md shadow-[#D4AF37]/20'
                                  : 'bg-black/50 border border-white/10 text-gray-300 hover:border-white/30'
                              }`}
                            >
                              {variant}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detail Tabs: Specifications, Reviews, Warranty */}
                  <div className="mb-6">
                    <div className="flex border-b border-[#1E1E24] text-xs font-semibold overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setActiveTab('specs')}
                        className={`min-h-[44px] pb-2.5 px-3 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          activeTab === 'specs'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'স্পেসিফিকেশন' : 'Specifications'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reviews')}
                        className={`min-h-[44px] pb-2.5 px-3 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          activeTab === 'reviews'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? `রিভিউ (${reviews.length})` : `Reviews (${reviews.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('warranty')}
                        className={`min-h-[44px] pb-2.5 px-3 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          activeTab === 'warranty'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'ওয়ারেন্টি ও রিটার্ন' : 'Warranty & Return'}
                      </button>
                    </div>

                    <div className="pt-4">
                      {activeTab === 'specs' && (
                        product.specs && product.specs.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            {product.specs.map((spec, i) => (
                              <div key={i} className="p-2.5 rounded-xl slate-bg border border-white/5">
                                <span className="text-gray-500 block text-[10px] uppercase font-mono">
                                  {language === 'bn' ? spec.labelBn : spec.labelEn}
                                </span>
                                <span className="text-white font-semibold mt-0.5 block">
                                  {language === 'bn' ? spec.valueBn : spec.valueEn}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 py-2">
                            {language === 'bn'
                              ? 'অফিসিয়াল সিল্ড প্যাকেজ এবং অনুমোদিত ওয়ারেন্টি কার্ডসহ সরবরাহ করা হয়।'
                              : 'Supplied in factory-sealed packaging with official distributor warranty verification.'}
                          </p>
                        )
                      )}

                      {activeTab === 'reviews' && (
                        <div className="space-y-4">
                          <form onSubmit={handleAddReview} className="p-3.5 rounded-2xl slate-bg border border-white/5 space-y-3">
                            <span className="text-xs font-bold text-white block">
                              {language === 'bn' ? 'রিভিউ দিন' : 'Leave a Verified Review'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400">Rating:</span>
                              <div className="flex gap-1 text-[#D4AF37]">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    type="button"
                                    key={star}
                                    onClick={() => setNewReviewRating(star)}
                                    className="cursor-pointer"
                                  >
                                    <Star className={`w-4 h-4 ${star <= newReviewRating ? 'fill-[#D4AF37]' : 'text-gray-600'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="text"
                              required
                              placeholder="Your Name (e.g. Tanzir Ahmed)"
                              value={newReviewAuthor}
                              onChange={(e) => setNewReviewAuthor(e.target.value)}
                              className="w-full min-h-[44px] bg-[#0A0A0C] border border-[#1E1E24] rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-gray-600 outline-none focus:border-[#D4AF37]"
                            />
                            <textarea
                              required
                              rows={2}
                              placeholder="Write your honest review..."
                              value={newReviewComment}
                              onChange={(e) => setNewReviewComment(e.target.value)}
                              className="w-full bg-[#0A0A0C] border border-[#1E1E24] rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder-gray-600 outline-none focus:border-[#D4AF37]"
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="min-h-[42px] gold-bg text-black font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer ml-auto disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSubmittingReview ? 'Submitting...' : 'Post Review'}</span>
                            </button>
                          </form>

                          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                            {reviews.map((rev) => (
                              <div key={rev.id} className="p-3 rounded-2xl slate-bg border border-white/5 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{rev.author}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">({rev.location})</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500">{rev.date}</span>
                                </div>
                                <div className="flex text-[#D4AF37] mb-1.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-[#D4AF37]' : 'text-gray-700'}`} />
                                  ))}
                                </div>
                                <p className="text-gray-300 leading-relaxed font-sans">{rev.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === 'warranty' && (
                        <div className="p-4 rounded-2xl slate-bg border border-white/5 space-y-3 text-xs text-gray-300">
                          <div className="flex items-start gap-2.5">
                            <ShieldCheck className="w-4 h-4 gold-text shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">
                                {language === 'bn' ? 'অফিসিয়াল ওয়ারেন্টি' : 'Official Distributor Warranty'}
                              </span>
                              <span>{warranty}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 pt-3 border-t border-white/5">
                            <RotateCcw className="w-4 h-4 gold-text shrink-0 mt-0.5" />
                            <div className="space-y-2 flex-1">
                              <span className="font-bold text-white block">
                                {language === 'bn'
                                  ? returnPolicy.titleBn || returnPolicy.titleEn
                                  : returnPolicy.titleEn || returnPolicy.titleBn}
                              </span>
                              <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                                {language === 'bn'
                                  ? returnPolicy.summaryBn || returnPolicy.summaryEn
                                  : returnPolicy.summaryEn || returnPolicy.summaryBn}
                              </p>
                              <ol className="space-y-1.5 pt-1">
                                {(language === 'bn' ? returnPolicy.stepsBn : returnPolicy.stepsEn).map((step, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
                                    <span className="w-4 h-4 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Purchase Actions Strip (Desktop/Tablet) */}
                <div className="pt-5 border-t border-[#1E1E24] flex flex-wrap items-center gap-3">
                  {/* Quantity Stepper */}
                  <div className="flex items-center slate-bg border border-white/10 rounded-full h-11 px-1">
                    <button
                      type="button"
                      disabled={isOutOfStock || quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-xs font-bold text-white font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setQuantity(Math.min(product.stockCount || 99, quantity + 1))}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(false)}
                    className="flex-1 min-h-[44px] slate-bg border border-white/15 hover:border-[#D4AF37]/60 text-white font-bold uppercase tracking-wider text-xs py-3 px-5 rounded-full shadow transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t('addToCart')}</span>
                  </button>

                  {/* Order Now (Direct Checkout) */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(true)}
                    className="flex-1 sm:flex-none min-h-[44px] gold-bg hover:brightness-110 text-black font-bold uppercase tracking-wider text-xs py-3 px-6 rounded-full shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{language === 'bn' ? 'অর্ডার করুন' : 'Order Now'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Wishlist Button */}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                      isWishlisted
                        ? 'border-[#D4AF37] gold-bg text-black'
                        : 'border-white/10 slate-bg text-gray-400 hover:text-white'
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-black' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Related Products Row */}
            {relatedProducts.length > 0 && (
              <div className="mt-10 pt-8 border-t border-[#1E1E24]">
                <h4 className="text-xs font-bold uppercase tracking-widest gold-text mb-4 font-mono">
                  {language === 'bn' ? 'একই ক্যাটাগরির অন্যান্য পণ্য' : 'RELATED PRODUCTS'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedProducts.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => setQuickViewProduct(rel)}
                      className="p-3 rounded-2xl slate-bg border border-white/5 hover:border-[#D4AF37]/40 transition-all cursor-pointer flex items-center gap-3 group"
                    >
                      <img
                        src={rel.image}
                        alt={rel.nameEn}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="overflow-hidden min-w-0">
                        <span className="text-[10px] text-gray-500 uppercase font-mono block truncate">{rel.brand}</span>
                        <h5 className="text-xs font-bold text-white group-hover:text-[#D4AF37] transition-colors truncate">
                          {language === 'bn' ? rel.nameBn : rel.nameEn}
                        </h5>
                        <span className="text-xs font-mono font-bold gold-text mt-0.5 block">
                          {formatBDT(rel.price, language)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Sticky Bottom Action Bar */}
            <div className="sm:hidden fixed bottom-0 inset-x-0 bg-[#0E0F14]/95 backdrop-blur-2xl border-t border-[#22222E] p-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-[0_-8px_20px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Total</span>
                <span className="text-sm font-bold text-[#D4AF37] font-sans truncate">
                  {formatBDT(product.price * quantity, language)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(false)}
                  className="min-h-[42px] px-3 py-2 rounded-xl slate-bg border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[11px]">{t('addToCart')}</span>
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(true)}
                  className="min-h-[42px] px-4 py-2 rounded-xl gold-bg text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all disabled:opacity-40"
                >
                  <span className="text-[11px]">{language === 'bn' ? 'অর্ডার করুন' : 'Order Now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
