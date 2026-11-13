import React, { useState } from 'react';
import { Star, Heart, ShoppingBag, ArrowUpRight, Package } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    language,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setQuickViewProduct,
    t,
  } = useApp();

  const [imgError, setImgError] = useState(false);

  const isWishlisted = isInWishlist(product.id);
  const title = language === 'bn' ? (product.nameBn || product.nameEn) : (product.nameEn || product.nameBn);
  const tagline = language === 'bn' ? (product.taglineBn || product.taglineEn) : (product.taglineEn || product.taglineBn);

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const isOutOfStock = !product.inStock || product.stockCount <= 0;

  const topBadgeText =
    hasDiscount && discountPercent > 0
      ? `-${discountPercent}%`
      : product.freeDelivery || product.category === 'free-delivery'
      ? language === 'bn'
        ? 'ফ্রি ডেলিভারি'
        : 'Free Delivery'
      : product.badge === 'bestseller'
      ? language === 'bn'
        ? 'বেস্টসেলার'
        : 'Bestseller'
      : product.badge === 'limited'
      ? language === 'bn'
        ? 'লিমিটেড'
        : 'Limited'
      : null;

  const handleOpenDetails = () => {
    setQuickViewProduct(product);
  };

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={handleOpenDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenDetails();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={language === 'bn' ? `${title} - বিস্তারিত দেখুন` : `${title} - View Details`}
      className="group bg-[#111217] border border-[#1E1E26] hover:border-[#D4AF37]/45 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/80 relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
    >
      {/* Square Product Image Stage */}
      <div className="relative aspect-square w-full bg-[#0A0A0D] overflow-hidden flex items-center justify-center">
        {!imgError && product.image ? (
          <img
            src={product.image}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-neutral-600">
            <Package className="w-8 h-8 text-[#D4AF37]/40" />
            <span className="text-[11px] font-medium text-neutral-400 text-center line-clamp-1">{title}</span>
          </div>
        )}

        {topBadgeText && (
          <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-semibold tracking-wider uppercase text-[#E5C158] tabular-nums">
            {topBadgeText}
          </span>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
            <span className="px-3 py-1 bg-black/85 border border-rose-500/40 text-rose-300 text-[11px] font-bold uppercase tracking-wider rounded">
              {t('outOfStock')}
            </span>
          </div>
        )}

        {/* Touch-friendly Wishlist Heart */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 right-2 z-20 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
            isWishlisted
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'bg-black/60 hover:bg-black text-white/85 hover:text-[#D4AF37] border border-white/10'
          }`}
          aria-label="Toggle Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-black' : ''}`} />
        </button>
      </div>

      {/* Product Details */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3 min-w-0">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          {/* Quiet Brand & Stock Line */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400 gap-1.5">
            <span className="uppercase tracking-[0.14em] font-medium truncate">
              {product.brand}
            </span>
            <span className={`shrink-0 font-medium ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isOutOfStock ? t('outOfStock') : t('inStock')}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="text-xs sm:text-[15px] font-semibold text-[#F3F4F6] group-hover:text-[#F3D078] line-clamp-2 transition-colors leading-snug">
            {title}
          </h3>

          {tagline && (
            <p className="text-[11px] text-neutral-500 line-clamp-1">
              {tagline}
            </p>
          )}

          {/* Rating & View Details */}
          <div className="flex items-center justify-between pt-0.5 gap-2">
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 tabular-nums">
              <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] shrink-0" />
              <span className="font-semibold text-neutral-200">{product.rating.toFixed(1)}</span>
              <span>({product.reviewsCount})</span>
            </div>

            <span className="text-[11px] font-medium text-[#D4AF37] group-hover:underline inline-flex items-center gap-0.5 shrink-0">
              <span>{language === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Bottom Price & Action */}
        <div className="pt-2.5 border-t border-[#1C1C24] flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-base font-bold text-white tracking-tight font-sans tabular-nums truncate">
              {formatBDT(product.price, language)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-neutral-500 line-through font-sans tabular-nums truncate">
                {formatBDT(product.originalPrice!, language)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            title={isOutOfStock ? t('outOfStock') : t('addToCart')}
            className="min-h-[42px] sm:min-h-[44px] min-w-[42px] sm:min-w-[44px] px-3 sm:px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#E5C158] disabled:bg-neutral-800 disabled:text-neutral-500 active:scale-95 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ব্যাগে নিন' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
