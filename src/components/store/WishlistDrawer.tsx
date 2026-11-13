import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { LuxuryButton } from '../ui/LuxuryButton';

export const WishlistDrawer: React.FC = () => {
  const {
    isWishlistOpen,
    setIsWishlistOpen,
    wishlist,
    toggleWishlist,
    addToCart,
    setQuickViewProduct,
    language,
    t,
  } = useApp();

  return (
    <AnimatePresence>
      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={t('wishlistTitle')}>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsWishlistOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="w-screen max-w-md bg-[#0F0F14] border-l border-[#22222E] flex flex-col shadow-2xl text-[#EDEDED]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-[#20202A] flex items-center justify-between bg-[#121218]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Heart className="w-5 h-5 text-[#D4AF37] shrink-0" />
                  <h3 className="text-base font-semibold tracking-wide font-luxury truncate">
                    {t('wishlistTitle')}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold font-sans tabular-nums">
                    {wishlist.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWishlistOpen(false)}
                  className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-[#80808C] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close wishlist"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3.5">
                {wishlist.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7E7E8C]">
                    <div className="w-16 h-16 rounded-full bg-[#181822] border border-white/5 flex items-center justify-center mb-4">
                      <Heart className="w-8 h-8 text-[#D4AF37]/40" />
                    </div>
                    <h4 className="text-base font-semibold text-[#EDEDED] mb-1 font-sans">
                      {t('wishlistEmpty')}
                    </h4>
                    <p className="text-xs text-[#80808C] max-w-xs mb-6 font-sans">
                      {language === 'bn'
                        ? 'আপনার পছন্দের আইটেমগুলোতে হার্ট আইকন ক্লিক করে সেভ করে রাখুন।'
                        : 'Click the heart icon on any product to curate your bespoke luxury wishlist.'}
                    </p>
                    <LuxuryButton
                      size="md"
                      variant="outline-gold"
                      onClick={() => setIsWishlistOpen(false)}
                    >
                      {t('continueShopping')}
                    </LuxuryButton>
                  </div>
                ) : (
                  wishlist.map((product) => {
                    const title = language === 'bn' ? product.nameBn : product.nameEn;
                    return (
                      <div
                        key={product.id}
                        className="flex gap-3 sm:gap-3.5 bg-[#14141A] border border-[#22222C] p-3 rounded-xl relative group"
                      >
                        <img
                          src={product.image}
                          alt={title}
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            setIsWishlistOpen(false);
                            setQuickViewProduct(product);
                          }}
                          className="w-20 h-20 object-cover rounded-lg border border-white/5 bg-black cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                onClick={() => {
                                  setIsWishlistOpen(false);
                                  setQuickViewProduct(product);
                                }}
                                className="text-xs sm:text-sm font-semibold text-[#EDEDED] hover:text-[#D4AF37] line-clamp-2 leading-snug cursor-pointer transition-colors"
                              >
                                {title}
                              </h4>
                              <button
                                type="button"
                                onClick={() => toggleWishlist(product)}
                                className="min-w-[36px] min-h-[36px] -mr-1 -mt-1 flex items-center justify-center rounded-lg text-[#757580] hover:text-red-400 hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                                title="Remove from wishlist"
                                aria-label="Remove from wishlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-[#D4AF37] block mt-1 font-sans tabular-nums">
                              {formatBDT(product.price, language)}
                            </span>
                          </div>

                          <div className="pt-2.5 mt-2 border-t border-[#1F1F28] flex justify-end">
                            <LuxuryButton
                              size="sm"
                              variant="primary-gold"
                              className="min-h-[38px] rounded-lg"
                              onClick={() => {
                                addToCart(product, 1);
                                toggleWishlist(product);
                              }}
                              leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                            >
                              {t('addToCart')}
                            </LuxuryButton>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
