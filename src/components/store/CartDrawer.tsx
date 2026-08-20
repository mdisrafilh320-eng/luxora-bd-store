import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, Truck, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { LuxuryButton } from '../ui/LuxuryButton';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartSubtotal,
    cartCount,
    freeDeliveryThreshold,
    isFreeDeliveryUnlocked,
    freeDeliveryDifference,
    language,
    t,
    user,
    setIsAuthModalOpen,
    addToast,
    setActiveView
  } = useApp();

  if (!isCartOpen) return null;

  const deliveryCharge = isFreeDeliveryUnlocked ? 0 : (cart.length > 0 ? 120 : 0);
  const totalAmount = cartSubtotal + deliveryCharge;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setActiveView('checkout');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsCartOpen(false)}
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
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#20202A] flex items-center justify-between bg-[#121218]">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-semibold tracking-wide font-luxury">
                  {t('cartTitle')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 font-semibold font-sans">
                  {cartCount} {t(cartCount === 1 ? 'item' : 'items')}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded text-[#80808C] hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Delivery Meter */}
            <div className="bg-[#15151E] px-5 py-3 border-b border-[#22222E]">
              <div className="flex items-center justify-between text-xs mb-1.5 font-sans">
                <span className="flex items-center gap-1.5 text-[#C0C0CC]">
                  <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {isFreeDeliveryUnlocked ? (
                    <span className="text-emerald-400 font-semibold">
                      {t('freeDeliveryUnlocked')}
                    </span>
                  ) : (
                    <span>
                      {t('freeDeliveryAway', { amount: formatBDT(freeDeliveryDifference, language) })}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-[#D4AF37]">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#252532] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#B89728] to-[#E5C158] transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#7E7E8C]">
                  <div className="w-16 h-16 rounded-full bg-[#181822] border border-white/5 flex items-center justify-center mb-4 text-[#555]">
                    <ShoppingBag className="w-8 h-8 text-[#D4AF37]/50" />
                  </div>
                  <h4 className="text-base font-semibold text-[#EDEDED] mb-1 font-sans">
                    {t('cartEmpty')}
                  </h4>
                  <p className="text-xs text-[#80808C] max-w-xs mb-6 font-sans">
                    {t('cartEmptyDesc')}
                  </p>
                  <LuxuryButton
                    size="sm"
                    variant="outline-gold"
                    onClick={() => setIsCartOpen(false)}
                  >
                    {t('continueShopping')}
                  </LuxuryButton>
                </div>
              ) : (
                cart.map((item) => {
                  const productTitle = language === 'bn' ? item.product.nameBn : item.product.nameEn;
                  return (
                    <div
                      key={item.product.id + (item.selectedColor || '')}
                      className="flex gap-3.5 bg-[#14141A] border border-[#22222C] p-3 rounded-sm relative group"
                    >
                      {/* Product Thumbnail */}
                      <img
                        src={item.product.image}
                        alt={productTitle}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 object-cover rounded-sm border border-white/5 bg-black"
                      />

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-[#EDEDED] line-clamp-2 leading-snug">
                              {productTitle}
                            </h4>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-[#656570] hover:text-red-400 p-1 transition-colors shrink-0"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {item.selectedColor && (
                            <span className="text-[10px] text-[#80808C] uppercase tracking-wider block mt-0.5">
                              {item.selectedColor}
                            </span>
                          )}
                        </div>

                        {/* Quantity & Item Subtotal */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1F1F28]">
                          <div className="flex items-center border border-[#2A2A36] rounded-sm bg-[#0E0E12]">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1 text-[#80808C] hover:text-white transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-semibold text-white font-sans">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 text-[#80808C] hover:text-white transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-xs font-bold text-[#D4AF37] font-sans">
                            {formatBDT(item.product.price * item.quantity, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer & Checkout Action */}
            {cart.length > 0 && (
              <div className="p-5 bg-[#121218] border-t border-[#20202A] space-y-3.5">
                {/* Cost Breakdown */}
                <div className="space-y-1.5 text-xs font-sans">
                  <div className="flex justify-between text-[#A0A0AA]">
                    <span>{t('subtotal')}</span>
                    <span className="font-semibold text-white font-sans">
                      {formatBDT(cartSubtotal, language)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A0A0AA]">
                    <span>{t('deliveryFee')}</span>
                    <span className="font-semibold text-emerald-400 font-sans">
                      {deliveryCharge === 0 ? t('freeDelivery') : formatBDT(deliveryCharge, language)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#242430] flex justify-between text-sm font-bold text-[#EDEDED]">
                    <span>Total Amount</span>
                    <span className="text-base text-[#E5C158] font-sans">
                      {formatBDT(totalAmount, language)}
                    </span>
                  </div>
                </div>

                {/* Cash On Delivery Assurance */}
                <div className="bg-[#181822] border border-[#D4AF37]/20 p-2.5 rounded-sm flex items-center gap-2 text-[11px] text-[#A8A8B4]">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span>{language === 'bn' ? 'ক্যাশ অন ডেলিভারিতে নিশ্চিন্তে অর্ডার করুন' : 'Cash on Delivery verified for all Bangladesh districts'}</span>
                </div>

                {/* Primary Gold CTA */}
                <LuxuryButton
                  fullWidth
                  size="md"
                  variant="primary-gold"
                  onClick={handleCheckout}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {language === 'bn' ? 'নিরাপদ চেকআউট ও পেমেন্ট' : 'Proceed to Secure Checkout'}
                </LuxuryButton>

                {/* Payment Methods Footer Strip */}
                <div className="text-center">
                  <span className="text-[10px] text-[#6E6E78] uppercase tracking-wider block mb-1">
                    {t('orPayWith')}
                  </span>
                  <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-[#80808C]">
                    <span className="px-2 py-0.5 bg-[#1B1B24] rounded-sm text-[#E2136E]">bKash</span>
                    <span className="px-2 py-0.5 bg-[#1B1B24] rounded-sm text-[#F7931E]">Nagad</span>
                    <span className="px-2 py-0.5 bg-[#1B1B24] rounded-sm text-blue-400">Visa / Card</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
