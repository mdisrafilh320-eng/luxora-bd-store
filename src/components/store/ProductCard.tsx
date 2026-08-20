import React from 'react';
import { Star, Heart, Eye, ShoppingBag, Check } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { Badge } from '../ui/Badge';
import { LuxuryButton } from '../ui/LuxuryButton';

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
    t
  } = useApp();

  const isWishlisted = isInWishlist(product.id);
  const title = language === 'bn' ? product.nameBn : product.nameEn;
  const tagline = language === 'bn' ? product.taglineBn : product.taglineEn;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group card-bg border border-[#1E1E24] hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-black/90 hover:-translate-y-1 relative"
    >
      {/* Top Image Container */}
      <div className="relative aspect-square w-full bg-[#0D0D10] overflow-hidden">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.badge === 'bestseller' && (
            <Badge variant="gold-solid" size="sm">
              {language === 'bn' ? 'বেস্টসেলার' : 'Bestseller'}
            </Badge>
          )}
          {product.badge === 'limited' && (
            <Badge variant="gold" size="sm">
              {language === 'bn' ? 'লিমিটেড স্টক' : 'Limited Edition'}
            </Badge>
          )}
          {product.badge === 'new' && (
            <Badge variant="slate" size="sm">
              {language === 'bn' ? 'নতুন রিলিজ' : 'New Arrival'}
            </Badge>
          )}
          {hasDiscount && (
            <Badge variant="sale" size="sm">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Quick Action Floating Buttons (Wishlist & Quick View) */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-95 ${
              isWishlisted
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-black/70 hover:bg-black text-white hover:text-[#D4AF37] border border-white/15'
            }`}
            aria-label="Toggle Wishlist"
            title={isWishlisted ? t('wishlistRemoved') : t('wishlistAdded')}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-black' : ''}`} />
          </button>

          <button
            onClick={() => setQuickViewProduct(product)}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-black/70 hover:bg-black text-white hover:text-[#D4AF37] border border-white/15 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-95"
            aria-label="Quick View"
            title={t('quickView')}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Quick View Hover Strip on Desktop */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex justify-center">
          <button
            onClick={() => setQuickViewProduct(product)}
            className="text-xs font-semibold text-[#EDEDED] hover:text-[#D4AF37] flex items-center gap-1.5 py-1 px-3 bg-black/70 rounded-full border border-white/15 backdrop-blur-md cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{t('quickView')}</span>
          </button>
        </div>
      </div>

      {/* Product Content & Details */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Stock Status */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#80808C] mb-1">
            <span className="uppercase tracking-widest font-semibold text-[#9A9AA6] truncate max-w-[65%]">
              {product.brand}
            </span>
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {product.inStock ? t('inStock') : t('outOfStock')}
            </span>
          </div>

          {/* Product Title */}
          <h3 
            onClick={() => setQuickViewProduct(product)}
            className="text-xs sm:text-base font-semibold text-[#EDEDED] hover:text-[#F3D078] line-clamp-2 transition-colors cursor-pointer mb-1 leading-snug"
          >
            {title}
          </h3>

          {/* Subtitle / Tagline */}
          <p className="text-[11px] sm:text-xs text-[#7A7A88] line-clamp-1 mb-2 sm:mb-3">
            {tagline}
          </p>

          {/* Star Rating */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
            <div className="flex items-center text-[#D4AF37]">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                    i < Math.floor(product.rating)
                      ? 'fill-[#D4AF37] text-[#D4AF37]'
                      : 'text-[#444]'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-[#D0D0DC]">
              {product.rating.toFixed(1)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#6A6A75]">
              ({product.reviewsCount})
            </span>
          </div>
        </div>

        {/* Pricing & Add to Cart Button */}
        <div className="pt-2.5 sm:pt-3 border-t border-[#1C1C24] flex items-center justify-between gap-1.5 sm:gap-2 mt-1 sm:mt-2">
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-lg font-bold text-[#EDEDED] tracking-tight font-sans truncate">
              {formatBDT(product.price, language)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] sm:text-xs text-[#70707C] line-through font-sans truncate">
                {formatBDT(product.originalPrice!, language)}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            title={t('addToCart')}
            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-full bg-[#D4AF37] hover:bg-[#F3D078] active:scale-95 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('addToCart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
