import React from 'react';
import { Star, Heart, Eye, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { Badge } from '../ui/Badge';

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
  const title = language === 'bn' ? (product.nameBn || product.nameEn) : (product.nameEn || product.nameBn);
  const tagline = language === 'bn' ? (product.taglineBn || product.taglineEn) : (product.taglineEn || product.taglineBn);

  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const isOutOfStock = !product.inStock || product.stockCount <= 0;

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
      className="group card-bg border border-[#1E1E24] hover:border-[#D4AF37]/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-black/90 hover:-translate-y-1 relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
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
          {hasDiscount && discountPercent > 0 && (
            <Badge variant="sale" size="sm">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
            <span className="px-3 py-1 bg-black/85 border border-rose-500/40 text-rose-300 text-[11px] font-bold uppercase tracking-wider rounded">
              {t('outOfStock')}
            </span>
          </div>
        )}

        {/* Quick Action Floating Buttons (Wishlist & View Details) */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col gap-2 z-20">
          <button
            type="button"
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
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails();
            }}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-black/70 hover:bg-black text-white hover:text-[#D4AF37] border border-white/15 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-95"
            aria-label={language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
            title={language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* View Details Hover Strip on Desktop */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex justify-center z-10">
          <span className="text-xs font-semibold text-[#EDEDED] group-hover:text-[#D4AF37] flex items-center gap-1.5 py-1.5 px-3.5 bg-black/75 rounded-full border border-white/15 backdrop-blur-md">
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}</span>
          </span>
        </div>
      </div>

      {/* Product Content & Details */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Stock Status */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#80808C] mb-1.5 gap-2">
            <span className="uppercase tracking-widest font-semibold text-[#9A9AA6] truncate">
              {product.brand}
            </span>
            <span className={`flex items-center gap-1 text-[10px] sm:text-[11px] shrink-0 font-medium ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              {isOutOfStock ? t('outOfStock') : t('inStock')}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="text-xs sm:text-base font-semibold text-[#EDEDED] group-hover:text-[#F3D078] line-clamp-2 transition-colors mb-1 leading-snug">
            {title}
          </h3>

          {/* Subtitle / Tagline */}
          {tagline && (
            <p className="text-[11px] sm:text-xs text-[#7A7A88] line-clamp-1 mb-2 sm:mb-2.5">
              {tagline}
            </p>
          )}

          {/* Star Rating & Explicit View Details Link */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-1.5">
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

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetails();
              }}
              className="text-[11px] font-semibold text-[#D4AF37] hover:underline flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>{language === 'bn' ? 'বিস্তারিত' : 'Details'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pricing & Action Buttons */}
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
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product, 1);
            }}
            title={isOutOfStock ? t('outOfStock') : t('addToCart')}
            className="min-h-[40px] min-w-[40px] sm:min-h-[38px] sm:min-w-0 px-3 py-2 sm:px-4 sm:py-2 rounded-xl sm:rounded-full bg-[#D4AF37] hover:bg-[#F3D078] disabled:bg-neutral-700 disabled:text-neutral-400 active:scale-95 text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('addToCart')}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
