import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Truck, 
  Package, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  User, 
  Clock, 
  Calendar, 
  CreditCard, 
  ArrowLeft, 
  MessageSquare, 
  AlertCircle,
  HelpCircle,
  FileText,
  Share2,
  Navigation,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { orderService, searchOrdersForTracking, getSampleTrackingOrder } from '../../services/orderService';
import { fetchLiveCourierTracking, LiveCourierDetails } from '../../services/courierService';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import { formatBDT } from '../../translations';

interface CourierTrackingViewProps {
  initialOrderId?: string;
  onBackToStore?: () => void;
}

export const CourierTrackingView: React.FC<CourierTrackingViewProps> = ({
  initialOrderId,
  onBackToStore,
}) => {
  const { language, t, setActiveView, user, addToast } = useApp();

  const [searchInput, setSearchInput] = useState(initialOrderId || '');
  const [isSearching, setIsSearching] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [courierDetails, setCourierDetails] = useState<LiveCourierDetails | null>(null);
  const [copiedConsignment, setCopiedConsignment] = useState(false);
  const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      handleSearch(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearch = async (queryText?: string) => {
    const q = (queryText || searchInput).trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const foundOrder = await searchOrdersForTracking(q);
      if (foundOrder) {
        setCurrentOrder(foundOrder);
        // Load live courier details
        const courierData = await fetchLiveCourierTracking(
          foundOrder.trackingInfo?.consignmentId || foundOrder.trackingInfo?.trackingNumber || 'STDF-PENDING',
          foundOrder.trackingInfo?.courier?.toLowerCase().includes('pathao') ? 'pathao' : 'steadfast'
        );
        setCourierDetails(courierData);
      } else {
        setCurrentOrder(null);
        setCourierDetails(null);
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setCurrentOrder(null);
      setCourierDetails(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyConsignment = (consignmentId: string) => {
    navigator.clipboard.writeText(consignmentId);
    setCopiedConsignment(true);
    setTimeout(() => setCopiedConsignment(false), 2000);
    addToast({
      type: 'info',
      titleEn: 'Consignment ID Copied',
      titleBn: 'কুরিয়ার কনসাইনমেন্ট কপি হয়েছে',
      descriptionEn: `Copied ${consignmentId} to clipboard.`,
    });
  };

  const handleShareTracking = () => {
    if (!currentOrder) return;
    const shareUrl = `${window.location.origin}?track=${currentOrder.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedTrackingLink(true);
    setTimeout(() => setCopiedTrackingLink(false), 2000);
    addToast({
      type: 'success',
      titleEn: 'Tracking Link Copied',
      titleBn: 'ট্র্যাকিং লিংক কপি হয়েছে',
      descriptionEn: 'Shareable tracking link copied to clipboard.',
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090C] text-[#EDEDED] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E28] pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToStore || (() => setActiveView('store'))}
              className="p-2 rounded-xl bg-[#14141C] border border-[#262634] text-gray-400 hover:text-white hover:border-[#D4AF37] transition-colors cursor-pointer"
              aria-label="Back to Store"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full gold-bg animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#D4AF37]">
                  {language === 'bn' ? 'লাইভ কুরিয়ার ট্র্যাকিং' : 'LIVE CONSIGNMENT DISPATCH'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-luxury tracking-wide mt-0.5">
                {language === 'bn' ? 'অর্ডার ও ডেলিভারি ট্র্যাকিং' : 'Courier Delivery Tracking'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('support')}
              className="px-3.5 py-2 rounded-xl bg-[#14141C] border border-[#262634] text-xs font-semibold hover:border-[#D4AF37] text-gray-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>{language === 'bn' ? 'সহায়তা কেন্দ্র' : 'Help & FAQs'}</span>
            </button>
            <button
              onClick={() => handleSearch(searchInput)}
              disabled={isSearching}
              className="p-2 rounded-xl bg-[#14141C] border border-[#262634] text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Live Status"
            >
              <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#121218] border border-[#22222E] shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={language === 'bn' 
                  ? 'আপনার Order ID (যেমন: LUX-892014) বা মোবাইল নম্বর লিখুন...' 
                  : 'Enter Order ID (e.g. LUX-892014) or Phone Number...'}
                className="w-full pl-12 pr-4 py-3.5 bg-[#0C0C10] border border-[#2A2A38] rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-all font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-7 py-3.5 rounded-2xl gold-bg text-black text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'সন্ধান হচ্ছে...' : 'Tracking...'}</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ট্র্যাক করুন' : 'Track Order'}</span>
                </>
              )}
            </button>
          </div>

          {/* Tracking instructions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1C1C26] text-xs text-gray-400">
            <span className="text-[11px] font-sans">
              {language === 'bn' 
                ? 'চেকআউট সম্পন্ন করার পর প্রাপ্ত Order ID (যেমন: LUX-XXXXXX) বা মোবাইল নম্বর দিয়ে সার্চ করুন।' 
                : 'Enter your Luxora BD Order ID (e.g. LUX-XXXXXX) or billing mobile number to track live status.'}
            </span>
          </div>
        </div>

        {/* Order Result Card */}
        {currentOrder ? (
          <div className="space-y-6">
            
            {/* Live Status & Overview Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#121218] border border-[#242432] space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#D4AF37]/5 blur-3xl pointer-events-none" />
              
              {/* Order Meta Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#20202A]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-wide text-white">
                      {currentOrder.id}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase border ${
                      currentOrder.orderStatus === 'Delivered' 
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' 
                        : currentOrder.orderStatus === 'In Transit' 
                        ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40 animate-pulse' 
                        : 'bg-blue-950/50 text-blue-400 border-blue-800/40'
                    }`}>
                      {currentOrder.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Placed on {new Date(currentOrder.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{new Date(currentOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShareTracking}
                    className="px-3.5 py-2 rounded-xl bg-[#181822] border border-[#2C2C3C] text-xs text-gray-300 hover:text-white hover:border-[#D4AF37] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {copiedTrackingLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedTrackingLink ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (language === 'bn' ? 'শেয়ার লিংক' : 'Share')}</span>
                  </button>
                </div>
              </div>

              {/* Visual 5-Stage Timeline */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs uppercase tracking-widest font-mono text-[#D4AF37]">
                    {language === 'bn' ? 'ডেলিভারি পর্যায়সমূহ' : 'Live Delivery Stages'}
                  </h3>
                  <span className="text-xs text-emerald-400 font-medium">
                    {currentOrder.trackingInfo?.estimatedDelivery || 'Estimated in 24-48 Hours'}
                  </span>
                </div>
                <OrderTrackingTimeline order={currentOrder} language={language} />
              </div>
            </div>

            {/* Courier API & Assigned Rider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Courier Partner Info */}
              <div className="p-6 rounded-3xl bg-[#121218] border border-[#22222E] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-luxury">
                        {currentOrder.trackingInfo?.courier || 'Steadfast Luxury Express'}
                      </h4>
                      <p className="text-[11px] text-gray-400">Official Nationwide Logistics Partner</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    API Connected
                  </span>
                </div>

                <div className="space-y-2.5 pt-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0E0E14] border border-[#1E1E28]">
                    <span className="text-gray-400">Consignment ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white font-bold">
                        {currentOrder.trackingInfo?.consignmentId || currentOrder.trackingInfo?.trackingNumber || 'STDF-892014-DX'}
                      </span>
                      <button
                        onClick={() => handleCopyConsignment(currentOrder.trackingInfo?.consignmentId || 'STDF-892014-DX')}
                        className="p-1 rounded bg-[#1C1C26] hover:bg-[#282836] text-gray-300 transition-colors"
                        title="Copy Consignment ID"
                      >
                        {copiedConsignment ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0E0E14] border border-[#1E1E28]">
                    <span className="text-gray-400">Current Sorting Hub:</span>
                    <span className="font-medium text-amber-300">Tejgaon Central Hub, Dhaka</span>
                  </div>
                </div>

                {currentOrder.trackingInfo?.trackingUrl && (
                  <a
                    href={currentOrder.trackingInfo.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#181822] hover:bg-[#20202E] border border-[#2E2E3E] text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <span>{language === 'bn' ? 'কুরিয়ার পোর্টাল থেকে সরাসরি ট্র্যাক করুন' : 'View on Courier Web Portal'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </a>
                )}
              </div>

              {/* Assigned Delivery Rider */}
              <div className="p-6 rounded-3xl bg-[#121218] border border-[#22222E] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-center text-blue-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-luxury">
                        {courierDetails?.assignedRider?.name || 'Tanvir Hossain (Delivery Hero)'}
                      </h4>
                      <p className="text-[11px] text-gray-400">{courierDetails?.assignedRider?.vehicleType || 'Motorbike Express Unit #42'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {courierDetails?.assignedRider?.rating || '4.9 ★'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0E0E14] border border-[#1E1E28] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Assigned Contact:</span>
                    <span className="font-mono text-white font-semibold">
                      {courierDetails?.assignedRider?.phone || '+880 1845-920182'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Security Verification:</span>
                    <span className="text-emerald-400 font-medium">OTP Code & Inspection Enabled</span>
                  </div>
                </div>

                <a
                  href={`tel:${courierDetails?.assignedRider?.phone || '+8801845920182'}`}
                  className="w-full py-2.5 px-4 rounded-xl gold-bg text-black text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#D4AF37]/15"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'রাইডারকে সরাসরি কল করুন' : 'Call Delivery Rider'}</span>
                </a>
              </div>
            </div>

            {/* Destination & Order Items Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Delivery Address & Notes */}
              <div className="p-6 rounded-3xl bg-[#121218] border border-[#22222E] space-y-3 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#D4AF37]">
                  <MapPin className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Coordinates'}</span>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Recipient:</span>
                    <span className="font-bold text-white text-sm">{currentOrder.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Phone:</span>
                    <span className="font-mono text-gray-300">{currentOrder.customer.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase">Shipping Address:</span>
                    <p className="text-gray-300 leading-relaxed">{currentOrder.customer.shippingAddress}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#1C1C26] text-[10px] font-mono text-[#D4AF37] font-semibold">
                      {currentOrder.customer.district || 'Dhaka'}
                    </span>
                  </div>
                  {currentOrder.customer.notes && (
                    <div className="pt-2 border-t border-[#1C1C26]">
                      <span className="text-gray-500 block text-[10px] uppercase">Special Notes:</span>
                      <p className="text-amber-400 text-[11px] italic">"{currentOrder.customer.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items & Payment Breakdown */}
              <div className="p-6 rounded-3xl bg-[#121218] border border-[#22222E] space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-[#D4AF37]">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>{language === 'bn' ? 'অর্ডারের পণ্যসমূহ' : 'Purchased Items'}</span>
                  </div>
                  <span className="text-gray-400 font-mono">
                    {currentOrder.items.length} {currentOrder.items.length === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {currentOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0E0E14] border border-[#1C1C26]">
                      <img
                        src={item.image}
                        alt={item.nameEn}
                        className="w-12 h-12 rounded-xl object-cover border border-[#262634] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">
                          {language === 'bn' ? item.nameBn : item.nameEn}
                        </h5>
                        <p className="text-[11px] text-gray-400">
                          Qty: <span className="font-mono text-white">{item.quantity}</span>
                          {item.selectedColor && <span> • Color: {item.selectedColor}</span>}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#D4AF37] font-mono shrink-0">
                        {formatBDT(item.price * item.quantity, language)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown */}
                <div className="pt-3 border-t border-[#20202A] space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">{formatBDT(currentOrder.subtotal, language)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Delivery Charge:</span>
                    <span className="font-mono text-emerald-400">
                      {currentOrder.deliveryCharge === 0 ? 'FREE' : formatBDT(currentOrder.deliveryCharge, language)}
                    </span>
                  </div>
                  {currentOrder.discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Voucher Discount:</span>
                      <span className="font-mono">- {formatBDT(currentOrder.discount, language)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#20202A] flex justify-between text-sm font-bold text-white">
                    <span>Total Amount:</span>
                    <span className="gold-text font-mono text-base">{formatBDT(currentOrder.totalAmount, language)}</span>
                  </div>

                  {currentOrder.paymentDetails && currentOrder.paymentOption === 'partial_advance' && (
                    <div className="p-3 rounded-xl bg-[#161620] border border-[#D4AF37]/30 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="text-emerald-400 block font-bold">Advance Paid via MFS: ৳120</span>
                        <span className="text-[10px] text-gray-400">TrxID: {currentOrder.paymentDetails.transactionId || 'BK9A8271XYZ'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold block text-sm">
                          Due on Delivery: {formatBDT(currentOrder.totalAmount - (currentOrder.paymentDetails.advanceAmount || 120), language)}
                        </span>
                        <span className="text-[10px] text-gray-400">(Cash on Delivery)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : hasSearched && !isSearching ? (
          /* Empty / Not Found State */
          <div className="p-12 rounded-3xl bg-[#121218] border border-[#22222E] text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-800/40 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-luxury text-white">
              {language === 'bn' ? 'কোনো অর্ডার খুঁজে পাওয়া যায়নি' : 'No Order Found'}
            </h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              {language === 'bn'
                ? 'অনুগ্রহ করে সঠিক Order ID (যেমন: LUX-892014) বা আপনার চেকআউটে ব্যবহৃত ফোন নম্বরটি মিলিয়ে দেখুন।'
                : 'Please verify your Order ID format (e.g. LUX-892014) or the phone number provided at checkout.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setSearchInput('');
                  setHasSearched(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1A1A24] border border-[#333346] text-gray-300 hover:text-white hover:border-[#D4AF37] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#D4AF37]" />
                <span>{language === 'bn' ? 'নতুন করে খুঁজুন' : 'Search Again'}</span>
              </button>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
};
