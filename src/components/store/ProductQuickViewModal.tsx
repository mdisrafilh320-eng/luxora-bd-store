import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShieldCheck, Truck, RotateCcw, Heart, ShoppingBag, Plus, Minus, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { LuxuryButton } from '../ui/LuxuryButton';
import { Badge } from '../ui/Badge';

export const ProductQuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    language,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setIsCartOpen,
    t
  } = useApp();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isWishlisted = isInWishlist(product.id);
  const title = language === 'bn' ? product.nameBn : product.nameEn;
  const tagline = language === 'bn' ? product.taglineBn : product.taglineEn;
  const description = language === 'bn' ? product.descriptionBn : product.descriptionEn;
  const warranty = language === 'bn' ? product.warrantyBn : product.warrantyEn;

  const galleryImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const activeImage = galleryImages[selectedImageIndex] || product.image;

  const handleAddToCart = (openDrawer = false) => {
    addToCart(product, quantity, selectedColor || product.colors?.[0]?.name);
    if (openDrawer) {
      setQuickViewProduct(null);
      setIsCartOpen(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl bg-[#111116] border border-[#262634] rounded-sm p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden text-[#EDEDED]"
          >
            {/* Top gold accent gradient */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#1E1E24]" />

            {/* Close Button */}
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 text-[#80808C] hover:text-white hover:bg-white/5 rounded-sm transition-colors cursor-pointer"
              aria-label="Close product modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
              
              {/* Left Column: Gallery */}
              <div className="flex flex-col gap-4">
                <div className="aspect-square bg-[#0C0C0F] border border-[#20202A] rounded-sm overflow-hidden relative">
                  <img
                    src={activeImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  {product.badge && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="gold-solid" size="sm">
                        {product.badge.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-16 h-16 rounded-sm border overflow-hidden shrink-0 transition-all ${
                          selectedImageIndex === idx
                            ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                            : 'border-[#22222E] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="Thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Trust mini-strip */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E1E28] text-xs text-[#90909C]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>100% Authentic</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Cash on Delivery</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Product Content & Actions */}
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#90909E] font-semibold">
                    {product.brand}
                  </span>

                  <h2 className="text-xl sm:text-2xl font-bold font-sans text-white mt-1 leading-snug">
                    {title}
                  </h2>

                  <p className="text-xs text-[#8A8A96] mt-1 italic">
                    {tagline}
                  </p>

                  {/* Rating & Stock */}
                  <div className="flex items-center gap-4 mt-3 pb-3 border-b border-[#1E1E28]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-[#D4AF37]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < Math.floor(product.rating) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#444]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-white">{product.rating}</span>
                      <span className="text-xs text-[#70707C]">({product.reviewsCount} reviews)</span>
                    </div>

                    <span className="text-xs font-semibold text-emerald-400">
                      • {t('inStock')} ({product.stockCount} available)
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="mt-4 flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-[#E5C158] font-sans">
                      {formatBDT(product.price, language)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-[#70707C] line-through font-sans">
                        {formatBDT(product.originalPrice, language)}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[#A8A8B6] mt-3 leading-relaxed">
                    {description}
                  </p>

                  {/* Color selector if applicable */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mt-4">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#9A9AA8] block mb-2">
                        {language === 'bn' ? 'কালার সিলেক্ট করুন:' : 'Select Finish:'}
                      </label>
                      <div className="flex gap-2">
                        {product.colors.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setSelectedColor(c.name)}
                            className={`px-3 py-1 text-xs rounded-sm border flex items-center gap-2 cursor-pointer transition-all ${
                              (selectedColor || product.colors?.[0]?.name) === c.name
                                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white font-semibold'
                                : 'border-[#242430] text-[#8E8E9A] hover:border-white/20'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                            <span>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technical Specifications */}
                  {product.specs && product.specs.length > 0 && (
                    <div className="mt-5 bg-[#14141C] border border-[#20202C] rounded-sm p-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2 font-luxury">
                        {t('productDetails')}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {product.specs.map((spec, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="text-[#757582] text-[11px]">
                              {language === 'bn' ? spec.labelBn : spec.labelEn}
                            </span>
                            <span className="text-[#EDEDED] font-medium font-sans">
                              {language === 'bn' ? spec.valueBn : spec.valueEn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warranty info */}
                  <div className="mt-3 text-xs text-[#8E8E98] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>{warranty}</span>
                  </div>
                </div>

                {/* Purchase Controls */}
                <div className="mt-6 pt-4 border-t border-[#1E1E28] flex flex-wrap items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center border border-[#2A2A36] rounded-sm bg-[#0E0E12] h-10">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 h-full text-[#80808C] hover:text-white transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-semibold text-white font-sans">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-2.5 h-full text-[#80808C] hover:text-white transition-colors"
                      aria-label="Increase"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to Bag */}
                  <LuxuryButton
                    variant="primary-gold"
                    size="md"
                    onClick={() => handleAddToCart(false)}
                    leftIcon={<ShoppingBag className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {t('addToCart')}
                  </LuxuryButton>

                  {/* Buy Now Direct Trigger */}
                  <LuxuryButton
                    variant="glass-slate"
                    size="md"
                    onClick={() => handleAddToCart(true)}
                  >
                    {t('buyNow')}
                  </LuxuryButton>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`h-10 w-10 border rounded-sm flex items-center justify-center transition-colors cursor-pointer ${
                      isWishlisted
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-[#2A2A38] text-[#80808C] hover:text-white'
                    }`}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#D4AF37]' : ''}`} />
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
