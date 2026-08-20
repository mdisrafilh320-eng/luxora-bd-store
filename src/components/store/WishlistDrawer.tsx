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
    language,
    t
  } = useApp();

  if (!isWishlistOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsWishlistOpen(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-[#0F0F14] border-l border-[#22222E] flex flex-col shadow-2xl text-[#EDEDED]"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#20202A] flex items-center justify-between bg-[#121218]">
              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-semibold tracking-wide font-luxury">
                  {t('wishlistTitle')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold font-sans">
                  {wishlist.length}
                </span>
              </div>
              <button
                onClick={() => setIsWishlistOpen(false)}
                className="p-1.5 rounded text-[#80808C] hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close wishlist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                    size="sm"
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
                      className="flex gap-3.5 bg-[#14141A] border border-[#22222C] p-3 rounded-sm relative group"
                    >
                      <img
                        src={product.image}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 object-cover rounded-sm border border-white/5 bg-black"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-[#EDEDED] line-clamp-2 leading-snug">
                              {title}
                            </h4>
                            <button
                              onClick={() => toggleWishlist(product)}
                              className="text-[#656570] hover:text-red-400 p-1 transition-colors shrink-0"
                              title="Remove from wishlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-[#D4AF37] block mt-1 font-sans">
                            {formatBDT(product.price, language)}
                          </span>
                        </div>

                        <div className="pt-2 mt-2 border-t border-[#1F1F28] flex justify-end">
                          <LuxuryButton
                            size="sm"
                            variant="primary-gold"
                            onClick={() => {
                              addToCart(product, 1);
                              toggleWishlist(product);
                            }}
                            leftIcon={<ShoppingBag className="w-3 h-3" />}
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
    </AnimatePresence>
  );
};
