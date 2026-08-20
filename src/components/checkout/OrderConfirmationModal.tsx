import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  ShoppingBag, 
  User, 
  Truck, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar,
  X,
  CreditCard,
  QrCode,
  Sparkles
} from 'lucide-react';
import { Order } from '../../types';
import { formatBDT } from '../../translations';
import { useApp } from '../../context/AppContext';

interface OrderConfirmationModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onContinueShopping: () => void;
  onViewOrders: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  isOpen,
  onClose,
  onContinueShopping,
  onViewOrders,
}) => {
  const { language, t } = useApp();
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const advanceAmount = order.paymentDetails?.advanceAmount || 0;
  const dueAmount = order.paymentDetails?.dueAmount || (order.paymentOption === 'cod' ? order.totalAmount : 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto max-w-full overflow-x-hidden bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
        {/* Modal Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 print:hidden"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-3xl card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 text-[#EDEDED] print:border-none print:shadow-none print:text-black print:bg-white print:max-w-full"
        >
          {/* Top Gold Ribbon */}
          <div className="h-1.5 w-full gold-bg print:hidden" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20 cursor-pointer print:hidden"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Printable Invoice Container */}
          <div ref={printRef} className="p-6 sm:p-8 space-y-6 print:p-4 print:space-y-4">
            {/* Header / Success Indicator */}
            <div className="text-center space-y-3 pb-6 border-b border-[#1E1E24] print:border-gray-200">
              <div className="w-16 h-16 rounded-full gold-bg/15 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37] print:hidden">
                <CheckCircle2 className="w-9 h-9 animate-bounce" />
              </div>

              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 gold-text print:hidden" />
                <span className="text-xs uppercase tracking-widest font-mono gold-text font-bold">
                  {language === 'bn' ? 'অর্ডার সফলভাবে নিবন্ধিত' : 'Order Placed & Registered in Firestore'}
                </span>
                <Sparkles className="w-4 h-4 gold-text print:hidden" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold font-luxury tracking-wide text-white print:text-black">
                {language === 'bn' ? 'লাক্সোরা বিডিতে কেনাকাটার জন্য ধন্যবাদ' : 'Thank You for Choosing Luxora BD'}
              </h2>

              <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto print:text-gray-600">
                {language === 'bn'
                  ? 'আপনার অর্ডারটি নিরাপদে গৃহীত হয়েছে। আমাদের এক্সিকিউটিভ ডেলিভারির জন্য প্রস্তুতি নিচ্ছেন।'
                  : 'Your luxury gadget order has been recorded in our cloud system. We will contact you prior to dispatch.'}
              </p>

              {/* Order ID Bar with Copy */}
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl slate-bg border border-white/10 print:border-gray-300 print:bg-gray-50">
                <span className="text-xs text-gray-400 font-mono">ORDER ID:</span>
                <span className="text-sm sm:text-base font-mono font-bold gold-text print:text-black">
                  {order.id}
                </span>
                <button
                  onClick={handleCopyOrderId}
                  className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer print:hidden"
                  title="Copy Order ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Payment & Delivery Status Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Payment Scheme */}
              <div className="p-3.5 rounded-xl slate-bg border border-[#1E1E24] print:border-gray-200 print:bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <CreditCard className="w-3.5 h-3.5 gold-text" />
                  <span>{language === 'bn' ? 'পেমেন্ট স্কিম' : 'Payment Scheme'}</span>
                </div>
                <div className="text-xs font-bold text-white capitalize print:text-black">
                  {order.paymentOption === 'partial_advance' ? (
                    <span className="text-amber-400 print:text-black">
                      {language === 'bn' ? 'আংশিক অগ্রিম চার্জ' : 'Partial (Advance Delivery)'}
                    </span>
                  ) : order.paymentOption === 'full_payment' ? (
                    <span className="text-emerald-400 print:text-black">
                      {language === 'bn' ? 'সম্পূর্ণ অগ্রিম পরিশোধ' : '100% Full Payment'}
                    </span>
                  ) : (
                    <span>{language === 'bn' ? 'ক্যাশ অন ডেলিভারি (সিওডি)' : 'Full Cash on Delivery'}</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  Method: {order.paymentMethod.toUpperCase()}
                  {order.paymentDetails?.mfsProvider && ` (${order.paymentDetails.mfsProvider.toUpperCase()})`}
                </div>
              </div>

              {/* Delivery Timeline */}
              <div className="p-3.5 rounded-xl slate-bg border border-[#1E1E24] print:border-gray-200 print:bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <Truck className="w-3.5 h-3.5 gold-text" />
                  <span>{language === 'bn' ? 'আনুমানিক ডেলিভারি' : 'Delivery Timeline'}</span>
                </div>
                <div className="text-xs font-bold text-white print:text-black">
                  {order.customer.district.toLowerCase().includes('dhaka') ? '24 Hours (Dhaka Metro)' : '48-72 Hours (Nationwide)'}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                  Courier: Steadfast Luxury Express
                </div>
              </div>

              {/* Verification Status */}
              <div className="p-3.5 rounded-xl slate-bg border border-[#1E1E24] print:border-gray-200 print:bg-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 gold-text" />
                  <span>{language === 'bn' ? 'ভেরিফিকেশন' : 'Verification'}</span>
                </div>
                <div className="text-xs font-bold text-emerald-400 print:text-black flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {order.paymentDetails?.transactionId
                    ? (language === 'bn' ? 'TrxID যাচাইাধীন' : 'TrxID Under Review')
                    : (language === 'bn' ? 'অর্ডার প্রসেসিং' : 'Dispatch Processing')}
                </div>
                <div className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                  {order.paymentDetails?.transactionId ? `Trx: ${order.paymentDetails.transactionId}` : 'Confirmed'}
                </div>
              </div>
            </div>

            {/* Customer & Shipping Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl slate-bg border border-[#1E1E24] text-xs print:border-gray-200 print:bg-gray-50">
              <div>
                <span className="text-gray-500 font-mono uppercase text-[10px] block mb-1">
                  {language === 'bn' ? 'গ্রাহকের তথ্য' : 'Recipient Details'}
                </span>
                <p className="font-bold text-white text-sm print:text-black">{order.customer.name}</p>
                <p className="text-gray-400 flex items-center gap-1.5 mt-0.5 print:text-gray-700">
                  <Phone className="w-3.5 h-3.5 text-gray-500" />
                  {order.customer.phone}
                </p>
                {order.customer.email && (
                  <p className="text-gray-400 text-[11px] print:text-gray-700">{order.customer.email}</p>
                )}
              </div>

              <div>
                <span className="text-gray-500 font-mono uppercase text-[10px] block mb-1">
                  {language === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Shipping Destination'}
                </span>
                <p className="text-white print:text-black flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                  <span>
                    {order.customer.shippingAddress}, {order.customer.district}
                    {order.customer.division ? `, ${order.customer.division}` : ''}
                  </span>
                </p>
                {order.customer.notes && (
                  <p className="text-[11px] text-amber-300/80 italic mt-1 print:text-gray-600">
                    Note: "{order.customer.notes}"
                  </p>
                )}
              </div>
            </div>

            {/* Ordered Items Table */}
            <div>
              <h4 className="text-xs uppercase tracking-wider font-mono text-gray-400 mb-2.5">
                {language === 'bn' ? 'অর্ডারকৃত পণ্যসমূহ' : 'Itemized Purchases'}
              </h4>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#14141A] border border-[#22222E] text-xs print:bg-white print:border-gray-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.nameEn}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded bg-black shrink-0 border border-white/10 print:border-gray-300"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-white truncate block print:text-black">
                          {language === 'bn' ? item.nameBn : item.nameEn}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono print:text-gray-600">
                          Qty: {item.quantity} {item.selectedColor ? `• Color: ${item.selectedColor}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-white whitespace-nowrap print:text-black">
                      {formatBDT(item.price * item.quantity, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-4 rounded-xl bg-[#14141A] border border-[#22222E] space-y-2 text-xs print:bg-gray-50 print:border-gray-200">
              <div className="flex justify-between text-gray-400 print:text-gray-600">
                <span>{language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono text-white print:text-black">{formatBDT(order.subtotal, language)}</span>
              </div>

              <div className="flex justify-between text-gray-400 print:text-gray-600">
                <span>{language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                <span className="font-mono text-emerald-400 print:text-black">
                  {order.deliveryCharge === 0 ? (language === 'bn' ? 'ফ্রি ডেলিভারি' : 'FREE') : formatBDT(order.deliveryCharge, language)}
                </span>
              </div>

              {order.discount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>{language === 'bn' ? 'ডিসকাউন্ট ভাউচার' : 'Promo Discount'} {order.promoCode ? `(${order.promoCode})` : ''}</span>
                  <span className="font-mono">- {formatBDT(order.discount, language)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#242430] flex justify-between text-sm font-bold text-white print:text-black print:border-gray-300">
                <span>{language === 'bn' ? 'সর্বমোট মূল্য' : 'Total Order Value'}</span>
                <span className="text-base gold-text font-mono print:text-black">{formatBDT(order.totalAmount, language)}</span>
              </div>

              {/* Partial Payment Calculation Summary */}
              {order.paymentOption === 'partial_advance' && (
                <div className="pt-2 border-t border-dashed border-[#333340] grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 print:text-black">
                    <span className="block text-[10px] uppercase text-emerald-400">{language === 'bn' ? 'অগ্রিম পরিশোধ' : 'Advance Paid (MFS)'}</span>
                    <span className="font-bold text-sm">{formatBDT(advanceAmount, language)}</span>
                  </div>
                  <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 print:text-black">
                    <span className="block text-[10px] uppercase text-amber-400">{language === 'bn' ? 'ডেলিভারিতে প্রদেয়' : 'Payable on Delivery (COD)'}</span>
                    <span className="font-bold text-sm">{formatBDT(dueAmount, language)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Print Footer Watermark */}
            <div className="hidden print:block pt-6 text-center text-xs text-gray-500 border-t border-gray-200">
              <p className="font-bold">Luxora BD - Minimalist Luxury Gadgets & Lifestyle</p>
              <p>House 42, Road 11, Banani, Dhaka, Bangladesh • Helpline: +880 1700-589672</p>
              <p className="text-[10px] mt-1">Generated electronically on {new Date().toLocaleString()} - No physical signature required.</p>
            </div>
          </div>

          {/* Action Footer (Hidden during Print) */}
          <div className="p-5 sm:p-6 bg-[#121218] border-t border-[#20202A] flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto slate-bg border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'ইনভয়েস প্রিন্ট' : 'Print Invoice'}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => {
                  onClose();
                  // Trigger direct tracking
                  window.location.search = `?track=${order.id}`;
                }}
                className="flex-1 sm:flex-initial slate-bg border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>{language === 'bn' ? 'লাইভ ট্র্যাক করুন' : 'Track Consignment'}</span>
              </button>

              <button
                onClick={onViewOrders}
                className="flex-1 sm:flex-initial slate-bg border border-white/10 hover:border-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{language === 'bn' ? 'অর্ডারসমূহ' : 'My Orders'}</span>
              </button>

              <button
                onClick={onContinueShopping}
                className="w-full sm:w-auto gold-bg text-black text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/15"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{language === 'bn' ? 'শপিং করুন' : 'Continue'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
