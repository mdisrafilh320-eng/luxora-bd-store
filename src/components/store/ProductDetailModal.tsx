import React, { useState } from 'react';
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
  Check,
  Award,
  Sparkles,
  MessageSquare,
  Send,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { Product } from '../../types';

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
    setIsCartOpen,
    products,
    t,
    addToast
  } = useApp();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'reviews' | 'warranty'>('specs');

  // Customer Reviews State
  const [reviews, setReviews] = useState<ReviewItem[]>([
    {
      id: 'rev-1',
      author: 'Farhan Kabir',
      location: 'Gulshan, Dhaka',
      rating: 5,
      date: '3 days ago',
      comment: '100% genuine product. Tested the serial code on the official portal and warranty was verified instantly. Same day express delivery in Dhaka!',
      verifiedPurchase: true,
    },
    {
      id: 'rev-2',
      author: 'Shahriar Hossain',
      location: 'Agrabad, Chittagong',
      rating: 5,
      date: '1 week ago',
      comment: 'The packaging and sound isolation are phenomenal. Luxora BD is without a doubt the most reliable luxury gadget source in Bangladesh.',
      verifiedPurchase: true,
    },
    {
      id: 'rev-3',
      author: 'Dr. Nusrat Jahan',
      location: 'Sylhet Sadar',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Premium build quality and aesthetic. Cash on Delivery was smooth and courteous.',
      verifiedPurchase: true,
    },
  ]);

  // Touch Swipe for Mobile Gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

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
    const galleryCount = (quickViewProduct?.gallery && quickViewProduct.gallery.length > 0) ? quickViewProduct.gallery.length : 1;

    if (diff > swipeThreshold) {
      // Swiped Left -> Next image
      setSelectedImageIndex((prev) => (prev + 1) % galleryCount);
    } else if (diff < -swipeThreshold) {
      // Swiped Right -> Prev image
      setSelectedImageIndex((prev) => (prev - 1 + galleryCount) % galleryCount);
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Review Form state
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWishlisted = isInWishlist(product.id);
  const title = language === 'bn' ? product.nameBn : product.nameEn;
  const tagline = language === 'bn' ? product.taglineBn : product.taglineEn;
  const description = language === 'bn' ? product.descriptionBn : product.descriptionEn;
  const warranty = language === 'bn' ? product.warrantyBn : product.warrantyEn;

  const galleryImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const activeImage = galleryImages[selectedImageIndex] || product.image;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const savings = hasDiscount ? (product.originalPrice! - product.price) : 0;

  const handleAddToCart = (directCheckout = false) => {
    addToCart(product, quantity, selectedColor || product.colors?.[0]?.name);
    if (directCheckout) {
      setQuickViewProduct(null);
      setIsCartOpen(true);
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
    }, 400);
  };

  // Recommended related gadgets
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto max-w-full overflow-x-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md transition-opacity"
        />

        <div className="min-h-full flex items-center justify-center p-2.5 sm:p-6 text-center max-w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="w-full max-w-5xl card-bg border border-[#1E1E24] rounded-3xl p-4 sm:p-8 lg:p-10 text-left shadow-2xl relative overflow-hidden text-[#F3F4F6]"
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#1E1E24]" />

            {/* Close Button */}
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-5 right-5 p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer z-20"
              aria-label="Close product modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main PDP Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-2">
              
              {/* Left Column: Interactive Image Gallery */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                {/* Active Main Showcase Image with Touch Swipe */}
                <div 
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="aspect-square bg-[#08080B] border border-[#1E1E24] rounded-2xl overflow-hidden relative group select-none cursor-grab active:cursor-grabbing"
                >
                  <img
                    src={activeImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
                    }}
                  />

                  {/* Mobile Swipe Hint Dots */}
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10 sm:hidden">
                      {galleryImages.map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          className={`h-1.5 rounded-full transition-all ${
                            selectedImageIndex === dotIdx
                              ? 'w-5 bg-[#D4AF37]'
                              : 'w-1.5 bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {product.badge && (
                      <span className="px-3 py-1 rounded-full gold-bg text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                        {product.badge}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-800/40 text-[10px] font-bold">
                        SAVE {formatBDT(savings, language)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails Row */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`min-w-[60px] min-h-[60px] sm:w-20 sm:h-20 rounded-xl border overflow-hidden shrink-0 transition-all cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105'
                            : 'border-[#1E1E24] opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Assurance Badges Strip */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl slate-bg border border-white/5 text-[11px] text-gray-300">
                  <div className="flex flex-col items-center text-center gap-1">
                    <ShieldCheck className="w-4 h-4 gold-text" />
                    <span className="font-semibold text-white">100% Original</span>
                    <span className="text-[9px] text-gray-500">Verified Serial</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 border-x border-white/5 px-2">
                    <Truck className="w-4 h-4 gold-text" />
                    <span className="font-semibold text-white">Express COD</span>
                    <span className="text-[9px] text-gray-500">All 64 Districts</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1">
                    <RotateCcw className="w-4 h-4 gold-text" />
                    <span className="font-semibold text-white">7-Day Return</span>
                    <span className="text-[9px] text-gray-500">Doorstep Claim</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Specifications, Controls & Reviews */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  {/* Brand & Stock Status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase tracking-[0.25em] font-bold gold-text">
                      {product.brand}
                    </span>
                    {product.stockCount <= 8 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[10px] font-bold animate-pulse">
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>{language === 'bn' ? `মাত্র ${product.stockCount}টি বাকি!` : `Only ${product.stockCount} Units Left`}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{t('inStock')}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <h1 className="text-2xl sm:text-3xl font-bold font-sans text-white leading-tight mb-2">
                    {title}
                  </h1>

                  <p className="text-xs sm:text-sm text-gray-400 mb-4 italic leading-relaxed">
                    {tagline}
                  </p>

                  {/* Star Rating Strip */}
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

                  {/* Price & Savings */}
                  <div className="py-4 flex items-baseline gap-4">
                    <span className="text-3xl sm:text-4xl font-bold gold-text font-sans">
                      {formatBDT(product.price, language)}
                    </span>
                    {hasDiscount && (
                      <span className="text-base text-gray-500 line-through font-sans">
                        {formatBDT(product.originalPrice!, language)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 font-sans">
                    {description}
                  </p>

                  {/* Color Finish Selector */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mb-6">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
                        {language === 'bn' ? 'কালার / ফিনিশ নির্বাচন করুন:' : 'Select Finish:'}
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {product.colors.map((c) => {
                          const isColorSelected = (selectedColor || product.colors?.[0]?.name) === c.name;
                          return (
                            <button
                              key={c.name}
                              onClick={() => setSelectedColor(c.name)}
                              className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 transition-all cursor-pointer ${
                                isColorSelected
                                  ? 'slate-bg gold-text border border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/20'
                                  : 'bg-black/50 border border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                              <span>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detail Tabs: Specifications, Reviews, Warranty */}
                  <div className="mb-6">
                    <div className="flex border-b border-[#1E1E24] text-xs font-semibold">
                      <button
                        onClick={() => setActiveTab('specs')}
                        className={`pb-2.5 px-3 transition-colors cursor-pointer ${
                          activeTab === 'specs'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'টেক স্পেসিফিকেশন' : 'Technical Specifications'}
                      </button>
                      <button
                        onClick={() => setActiveTab('reviews')}
                        className={`pb-2.5 px-3 transition-colors cursor-pointer ${
                          activeTab === 'reviews'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? `রিভিউ (${reviews.length})` : `Verified Reviews (${reviews.length})`}
                      </button>
                      <button
                        onClick={() => setActiveTab('warranty')}
                        className={`pb-2.5 px-3 transition-colors cursor-pointer ${
                          activeTab === 'warranty'
                            ? 'gold-text border-b-2 gold-border font-bold'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'ওয়ারেন্টি ও ডেলিভারি' : 'Warranty & Delivery'}
                      </button>
                    </div>

                    <div className="pt-4">
                      {/* 1. Tech Specs View */}
                      {activeTab === 'specs' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          {product.specs?.map((spec, i) => (
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
                      )}

                      {/* 2. Reviews & Write Review Tab */}
                      {activeTab === 'reviews' && (
                        <div className="space-y-4">
                          {/* Write Review Input */}
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
                              className="w-full bg-[#0A0A0C] border border-[#1E1E24] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#D4AF37]"
                            />
                            <textarea
                              required
                              rows={2}
                              placeholder="Write your honest review on performance, delivery & authenticity..."
                              value={newReviewComment}
                              onChange={(e) => setNewReviewComment(e.target.value)}
                              className="w-full bg-[#0A0A0C] border border-[#1E1E24] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#D4AF37]"
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingReview}
                              className="gold-bg text-black font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer ml-auto disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSubmittingReview ? 'Submitting...' : 'Post Review'}</span>
                            </button>
                          </form>

                          {/* Existing Reviews List */}
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

                      {/* 3. Warranty Tab */}
                      {activeTab === 'warranty' && (
                        <div className="p-4 rounded-2xl slate-bg border border-white/5 space-y-3 text-xs text-gray-300">
                          <div className="flex items-start gap-2.5">
                            <ShieldCheck className="w-4 h-4 gold-text shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Official Distributor Warranty</span>
                              <span>{warranty}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 pt-2 border-t border-white/5">
                            <RotateCcw className="w-4 h-4 gold-text shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">7-Day Replacement Policy</span>
                              <span>If any manufacturing fault is discovered, we arrange doorstep pick-up and replacement nationwide.</span>
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
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-3 text-xs font-bold text-white font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add to Bag */}
                  <button
                    onClick={() => handleAddToCart(false)}
                    className="flex-1 min-h-[44px] slate-bg border border-white/10 hover:border-white/20 text-white font-bold uppercase tracking-widest text-xs py-3.5 px-6 rounded-full shadow transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t('addToCart')}</span>
                  </button>

                  {/* Buy Now (Direct Checkout) */}
                  <button
                    onClick={() => handleAddToCart(true)}
                    className="min-h-[44px] gold-bg hover:brightness-110 text-black font-bold uppercase tracking-widest text-xs py-3.5 px-6 rounded-full shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>{t('buyNow')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Wishlist Button */}
                  <button
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

            {/* Mobile Fixed Sticky Quick Action Bar */}
            <div className="sm:hidden fixed bottom-0 inset-x-0 bg-[#0E0F14]/95 backdrop-blur-2xl border-t border-[#22222E] p-3 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 shadow-[0_-8px_20px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Total Price</span>
                <span className="text-base font-bold text-[#D4AF37] font-sans truncate">
                  {formatBDT(product.price * quantity, language)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-1 justify-end">
                <button
                  onClick={() => handleAddToCart(false)}
                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl slate-bg border border-white/15 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[11px]">{t('addToCart')}</span>
                </button>

                <button
                  onClick={() => handleAddToCart(true)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl gold-bg text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all"
                >
                  <span className="text-[11px]">{t('buyNow')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Related Gadgets Row */}
            {relatedProducts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-[#1E1E24]">
                <h4 className="text-sm font-bold uppercase tracking-widest gold-text mb-4 font-mono">
                  {language === 'bn' ? 'একই ক্যাটাগরির অন্যান্য গ্যাজেট' : 'RELATED COMPANION GADGETS'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedProducts.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => setQuickViewProduct(rel)}
                      className="p-3 rounded-2xl slate-bg border border-white/5 hover:border-[#D4AF37]/40 transition-all cursor-pointer flex items-center gap-3 group"
                    >
                      <img src={rel.image} alt={rel.nameEn} referrerPolicy="no-referrer" className="w-14 h-14 rounded-xl object-cover" />
                      <div className="overflow-hidden">
                        <span className="text-[10px] text-gray-500 uppercase font-mono block">{rel.brand}</span>
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

          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
