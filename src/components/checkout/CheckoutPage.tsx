import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Check, 
  Upload, 
  X, 
  ArrowLeft, 
  ShoppingBag, 
  Sparkles, 
  Tag, 
  AlertCircle, 
  Loader2, 
  HelpCircle,
  Lock,
  ChevronDown,
  AlertTriangle,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { BD_DIVISIONS, BD_DISTRICTS, getDeliveryCharge, getDeliveryTime } from '../../data/bangladeshLocations';
import { MFS_GATEWAYS, PROMO_CODES, MfsGateway } from '../../data/mfsGateways';
import { PaymentMethod, PaymentOption, Order, MfsGatewayConfig } from '../../types';
import { orderService } from '../../services/orderService';
import { uploadPaymentProof } from '../../services/storageService';
import { OrderConfirmationModal } from './OrderConfirmationModal';

export const CheckoutPage: React.FC = () => {
  const { 
    cart, 
    cartSubtotal, 
    clearCart, 
    user, 
    language, 
    t, 
    setActiveView, 
    addToast,
    paymentSettings 
  } = useApp();

  // Form State
  const [fullName, setFullName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedDivision, setSelectedDivision] = useState('dhaka');
  const [selectedDistrict, setSelectedDistrict] = useState('dhaka');
  const [fullAddress, setFullAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Payment State
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('partial_advance');
  const [selectedMfs, setSelectedMfs] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // UI / Action State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Determine active MFS gateways dynamically from Firestore settings
  const activeMfsList = (['bkash', 'nagad', 'rocket'] as const).filter((mfsKey) => {
    const config = paymentSettings?.gateways?.[mfsKey];
    return config ? config.isActive !== false : true;
  });

  // Auto-sync selected MFS if current choice is disabled
  useEffect(() => {
    if (activeMfsList.length > 0 && !activeMfsList.includes(selectedMfs)) {
      setSelectedMfs(activeMfsList[0]);
    }
  }, [activeMfsList, selectedMfs]);

  // Sync user profile data if available
  useEffect(() => {
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.email && !email) setEmail(user.email);
    if (user?.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
  }, [user]);

  // Filter districts by selected division
  const filteredDistricts = BD_DISTRICTS.filter(d => d.division === selectedDivision);

  // Keep district synchronized if division changes
  useEffect(() => {
    const validInDivision = BD_DISTRICTS.some(d => d.division === selectedDivision && d.id === selectedDistrict);
    if (!validInDivision && filteredDistricts.length > 0) {
      setSelectedDistrict(filteredDistricts[0].id);
    }
  }, [selectedDivision]);

  // Pricing calculations
  const baseDeliveryCharge = getDeliveryCharge(selectedDistrict, cartSubtotal);
  const effectiveDeliveryCharge = appliedPromo === 'VIPFREESHIP' ? 0 : baseDeliveryCharge;
  const totalAmount = Math.max(0, cartSubtotal + effectiveDeliveryCharge - promoDiscount);

  // Partial Payment breakdown
  const advancePayableAmount = paymentOption === 'full_payment' 
    ? totalAmount 
    : (paymentOption === 'partial_advance' ? (effectiveDeliveryCharge > 0 ? effectiveDeliveryCharge : (paymentSettings?.partialAdvanceAmount || 200)) : 0);

  const dueOnDeliveryAmount = paymentOption === 'full_payment' 
    ? 0 
    : (paymentOption === 'partial_advance' ? Math.max(0, totalAmount - advancePayableAmount) : totalAmount);

  // Active dynamic MFS gateway details
  const staticMfs = MFS_GATEWAYS[selectedMfs] || MFS_GATEWAYS.bkash;
  const dynamicConfig: MfsGatewayConfig | undefined = paymentSettings?.gateways?.[selectedMfs];
  
  const currentMfs = {
    ...staticMfs,
    accountNumber: dynamicConfig?.accountNumber || staticMfs.accountNumber,
    accountType: dynamicConfig?.accountType || 'personal',
    isActive: dynamicConfig ? dynamicConfig.isActive : true,
    sendMoneyOnly: dynamicConfig ? dynamicConfig.sendMoneyOnly : true,
    notesEn: dynamicConfig?.notesEn || staticMfs.instructionsEn[1],
    notesBn: dynamicConfig?.notesBn || staticMfs.instructionsBn[1],
  };

  // Copy official MFS number handler
  const handleCopyMfsNumber = () => {
    navigator.clipboard.writeText(currentMfs.accountNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Promo Code Apply
  const handleApplyPromo = () => {
    const cleanedCode = promoCodeInput.trim().toUpperCase();
    if (!cleanedCode) return;

    const promo = PROMO_CODES[cleanedCode];
    if (!promo) {
      addToast({
        type: 'error',
        titleEn: 'Invalid Voucher Code',
        titleBn: 'ভুল ভাউচার কোড',
        descriptionEn: 'The voucher code entered is not valid or expired.',
        descriptionBn: 'প্রদত্ত ভাউচার কোডটি সঠিক নয়।',
      });
      return;
    }

    if (cartSubtotal < promo.minOrder) {
      addToast({
        type: 'warning',
        titleEn: 'Minimum Order Requirement',
        titleBn: 'ন্যূনতম অর্ডারের শর্ত',
        descriptionEn: `This voucher requires a minimum order of ${formatBDT(promo.minOrder, 'en')}.`,
        descriptionBn: `এই ভাউচারটির জন্য কমপক্ষে ${formatBDT(promo.minOrder, 'bn')} টাকার অর্ডার প্রয়োজন।`,
      });
      return;
    }

    let calculatedDiscount = 0;
    if (promo.discountPercent) {
      calculatedDiscount = Math.min(2000, Math.round((cartSubtotal * promo.discountPercent) / 100));
    } else if (promo.flatDiscount) {
      calculatedDiscount = promo.flatDiscount;
    }

    setAppliedPromo(cleanedCode);
    setPromoDiscount(calculatedDiscount);

    addToast({
      type: 'success',
      titleEn: `Voucher Applied: ${cleanedCode}`,
      titleBn: `ভাউচার যুক্ত হয়েছে: ${cleanedCode}`,
      descriptionEn: `You saved ${formatBDT(calculatedDiscount, 'en')} on this order!`,
      descriptionBn: `আপনি ${formatBDT(calculatedDiscount, 'bn')} ছাড় পেয়েছেন!`,
    });
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCodeInput('');
  };

  // Image Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({
          type: 'error',
          titleEn: 'Invalid File Type',
          titleBn: 'ভুল ফাইল টাইপ',
          descriptionEn: 'Please select a valid screenshot image file (PNG, JPG, JPEG).',
        });
        return;
      }
      setScreenshotFile(file);
      const previewUrl = URL.createObjectURL(file);
      setScreenshotPreview(previewUrl);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = language === 'bn' ? 'গ্রাহকের পুরো নাম লিখুন' : 'Recipient full name is required';
    }

    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phoneNumber = language === 'bn' ? 'সঠিক বাংলাদেশি ফোন নম্বর লিখুন (১১ ডিজিট)' : 'Valid 11-digit mobile number is required';
    }

    if (!fullAddress.trim() || fullAddress.trim().length < 6) {
      errors.fullAddress = language === 'bn' ? 'বাড়ি, রোড ও এলাকার বিস্তারিত ঠিকানা লিখুন' : 'Detailed delivery address (House/Road/Area) is required';
    }

    if (paymentOption === 'full_payment' || paymentOption === 'partial_advance') {
      if (!transactionId.trim()) {
        errors.transactionId = language === 'bn' ? 'MFS ট্রানজেকশন আইডি (TrxID) প্রদান করুন' : 'Transaction ID (TrxID) is required for verification';
      } else if (transactionId.trim().length < 6) {
        errors.transactionId = language === 'bn' ? 'সঠিক ট্রানজেকশন আইডি দিন' : 'Please provide a valid TrxID';
      }

      if (!senderNumber.trim()) {
        errors.senderNumber = language === 'bn' ? 'প্রেরকের মোবাইল নম্বর দিন' : 'Sender mobile number is required';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Order Submission to Firestore
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      addToast({
        type: 'warning',
        titleEn: 'Your Bag is Empty',
        titleBn: 'আপনার ব্যাগ খালি',
        descriptionEn: 'Add products to your cart before proceeding to checkout.',
      });
      return;
    }

    if (!validateForm()) {
      addToast({
        type: 'error',
        titleEn: 'Missing Required Information',
        titleBn: 'ফর্ম পূরণ অসম্পূর্ণ',
        descriptionEn: 'Please check and complete all required checkout fields.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedProofUrl: string | undefined = undefined;
      let uploadedProofName: string | undefined = undefined;

      // Upload payment screenshot if provided
      if (screenshotFile) {
        setIsUploadingProof(true);
        try {
          const tempOrderId = 'TEMP-' + Date.now();
          const uploadResult = await uploadPaymentProof(screenshotFile, tempOrderId);
          uploadedProofUrl = uploadResult.url;
          uploadedProofName = uploadResult.fileName;
        } catch (uploadErr) {
          console.warn('Screenshot upload skipped:', uploadErr);
        } finally {
          setIsUploadingProof(false);
        }
      }

      const paymentMethodValue: PaymentMethod = (paymentOption === 'full_payment' || paymentOption === 'partial_advance') 
        ? selectedMfs 
        : 'cod';

      // Create Order in Firestore
      const newOrder = await orderService.createOrder({
        userId: user?.id || 'guest',
        customer: {
          name: fullName.trim(),
          phone: phoneNumber.trim(),
          email: email.trim() || undefined,
          division: BD_DIVISIONS.find(d => d.id === selectedDivision)?.nameEn || selectedDivision,
          district: BD_DISTRICTS.find(d => d.id === selectedDistrict)?.nameEn || selectedDistrict,
          shippingAddress: fullAddress.trim(),
          notes: deliveryNotes.trim() || undefined,
        },
        items: cart.map(item => ({
          productId: item.product.id,
          nameEn: item.product.nameEn,
          nameBn: item.product.nameBn,
          image: item.product.image,
          price: item.product.price,
          quantity: item.quantity,
          selectedColor: item.selectedColor,
          sku: item.product.id,
        })),
        subtotal: cartSubtotal,
        deliveryCharge: effectiveDeliveryCharge,
        discount: promoDiscount,
        promoCode: appliedPromo || undefined,
        totalAmount: totalAmount,
        paymentMethod: paymentMethodValue,
        paymentOption: paymentOption,
        paymentDetails: {
          method: paymentMethodValue,
          option: paymentOption,
          mfsProvider: (paymentOption === 'full_payment' || paymentOption === 'partial_advance') ? selectedMfs : undefined,
          advanceAmount: advancePayableAmount,
          dueAmount: dueOnDeliveryAmount,
          senderNumber: senderNumber.trim() || undefined,
          transactionId: transactionId.trim().toUpperCase() || undefined,
          paymentProofUrl: uploadedProofUrl,
          paymentProofName: uploadedProofName,
          paymentTimestamp: new Date().toISOString(),
        },
        paymentStatus: paymentOption === 'partial_advance' ? 'partially_paid' : (paymentOption === 'full_payment' ? 'pending' : 'pending'),
        orderStatus: 'Pending',
        trackingInfo: {
          courier: 'Steadfast Luxury Express',
          estimatedDelivery: getDeliveryTime(selectedDistrict, 'en'),
        },
      });

      // Clear cart on successful order
      clearCart();
      setConfirmedOrder(newOrder);
      setIsConfirmationOpen(true);

      addToast({
        type: 'success',
        titleEn: `Order Confirmed: ${newOrder.id}`,
        titleBn: `অর্ডার নিশ্চিত হয়েছে: ${newOrder.id}`,
        descriptionEn: `Your order of ${formatBDT(totalAmount, 'en')} is registered in Firestore.`,
        descriptionBn: `আপনার ${formatBDT(totalAmount, 'bn')} টাকার অর্ডার সফলভাবে সংরক্ষিত হয়েছে।`,
      });

    } catch (error: any) {
      console.error('Failed to create order in Firestore:', error);
      addToast({
        type: 'error',
        titleEn: 'Order Submission Failed',
        titleBn: 'অর্ডারে সমস্যা দেখা দিয়েছে',
        descriptionEn: error?.message || 'Please check your internet connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0 && !confirmedOrder) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center text-[#EDEDED]">
        <div className="w-20 h-20 rounded-3xl slate-bg border border-white/10 flex items-center justify-center mx-auto mb-6 text-gray-500 shadow-xl">
          <ShoppingBag className="w-10 h-10 gold-text" />
        </div>
        <h2 className="text-2xl font-bold font-luxury tracking-wide mb-2 text-white">
          {language === 'bn' ? 'আপনার শপিং ব্যাগ খালি' : 'Your Luxury Bag is Empty'}
        </h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto mb-8 font-sans">
          {language === 'bn'
            ? 'অর্ডার করতে অনুগ্রহ করে আমাদের ক্যাটালগ থেকে পছন্দের প্রিমিয়াম গ্যাজেট কার্টে যোগ করুন।'
            : 'Select items from our curated audio, wearable, or desk setups before proceeding.'}
        </p>
        <button
          onClick={() => setActiveView('store')}
          className="gold-bg text-black text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-full hover:brightness-110 cursor-pointer shadow-lg shadow-[#D4AF37]/20 transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'bn' ? 'কালেকশনে ফিরে যান' : 'Explore Collections'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-[#EDEDED]">
      {/* Back to store */}
      <button
        onClick={() => setActiveView('store')}
        className="text-xs text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{language === 'bn' ? 'কেনাকাটায় ফিরে যান' : 'Back to Boutique'}</span>
      </button>

      {/* Header Banner */}
      <div className="card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 inset-x-0 h-1 gold-bg" />
        <div>
          <div className="flex items-center gap-2 text-xs uppercase font-mono gold-text font-bold mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>256-Bit SSL Cloud Encrypted Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-luxury tracking-wide text-white">
            {language === 'bn' ? 'নিরাপদ চেকআউট ও পেমেন্ট' : 'Secure Luxury Checkout'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {language === 'bn' 
              ? 'অগ্রিম বা ক্যাশ অন ডেলিভারিতে সারাদেশে নিশ্চিন্তে অর্ডার সম্পন্ন করুন।'
              : 'Complete your luxury gadget purchase with flexible payment terms & live MFS verification.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg slate-bg border border-white/10 text-[11px] font-mono flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Authentic BD Stock</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Order Summary on Right */}
      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Details & Payment (8 Columns) */}
        <div className="lg:col-span-8 space-y-8">

          {/* Section 1: Customer & Delivery Address */}
          <div className="card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-[#20202A]">
              <div className="w-8 h-8 rounded-full gold-bg text-black flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  {language === 'bn' ? 'ডেলিভারি ও যোগাযোগের তথ্য' : 'Delivery & Client Dossier'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'পণ্য প্রেরণের জন্য সঠিক তথ্য প্রদান করুন' : 'Provide your verified delivery coordinates'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'গ্রাহকের পুরো নাম *' : 'Recipient Full Name *'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className={`w-full bg-[#121218] border ${
                      formErrors.fullName ? 'border-red-500/80' : 'border-[#2A2A36]'
                    } rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors`}
                  />
                </div>
                {formErrors.fullName && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.fullName}
                  </span>
                )}
              </div>

              {/* Mobile Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Contact Mobile Number *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className={`w-full bg-[#121218] border ${
                      formErrors.phoneNumber ? 'border-red-500/80' : 'border-[#2A2A36]'
                    } rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono transition-colors`}
                  />
                </div>
                {formErrors.phoneNumber && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.phoneNumber}
                  </span>
                )}
              </div>

              {/* Division Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'বিভাগ নির্বাচন করুন *' : 'Division *'}
                </label>
                <div className="relative">
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full bg-[#121218] border border-[#2A2A36] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D4AF37] appearance-none cursor-pointer"
                  >
                    {BD_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.id} className="bg-[#181822]">
                        {language === 'bn' ? div.nameBn : div.nameEn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* District Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'জেলা নির্বাচন করুন *' : 'District *'}
                </label>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-[#121218] border border-[#2A2A36] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D4AF37] appearance-none cursor-pointer"
                  >
                    {filteredDistricts.map((dist) => (
                      <option key={dist.id} value={dist.id} className="bg-[#181822]">
                        {language === 'bn' ? dist.nameBn : dist.nameEn}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3.5 text-gray-500 pointer-events-none" />
                </div>
                <span className="text-[11px] text-[#D4AF37] flex items-center gap-1 font-mono">
                  <Truck className="w-3 h-3" />
                  {getDeliveryTime(selectedDistrict, language)}
                </span>
              </div>
            </div>

            {/* Full Street / Area Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                {language === 'bn' ? 'সম্পূর্ণ ডেলিভারি ঠিকানা (বাড়ি, রোড, এলাকা) *' : 'Full Shipping Address (House, Road, Block, Area) *'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500" />
                <textarea
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="e.g. House #24, Road #11, Block D, Banani, Dhaka"
                  className={`w-full bg-[#121218] border ${
                    formErrors.fullAddress ? 'border-red-500/80' : 'border-[#2A2A36]'
                  } rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors`}
                />
              </div>
              {formErrors.fullAddress && (
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.fullAddress}
                </span>
              )}
            </div>

            {/* Optional Delivery Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                {language === 'bn' ? 'বিশেষ নির্দেশনা (ঐচ্ছিক)' : 'Courier Handling Notes (Optional)'}
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Call before delivery, handle fragile electronics"
                className="w-full bg-[#121218] border border-[#2A2A36] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* Section 2: Flexible Payment Framework */}
          <div className="card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-4 border-b border-[#20202A]">
              <div className="w-8 h-8 rounded-full gold-bg text-black flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  {language === 'bn' ? 'পেমেন্ট পদ্ধতি নির্বাচন করুন' : 'Flexible Payment Framework'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'সম্পূর্ণ অগ্রিম, আংশিক অগ্রিম চার্জ বা সিওডি নির্বাচন করুন' : 'Choose your preferred balance & settlement strategy'}
                </p>
              </div>
            </div>

            {/* Three Strategic Payment Scheme Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              
              {/* Option B: Partial Advance (RECOMMENDED) */}
              <div
                onClick={() => setPaymentOption('partial_advance')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  paymentOption === 'partial_advance'
                    ? 'card-bg gold-border shadow-lg shadow-[#D4AF37]/10'
                    : 'slate-bg border-[#22222E] hover:border-white/20'
                }`}
              >
                <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg gold-bg text-black text-[9px] font-black uppercase tracking-wider">
                  POPULAR
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentOption === 'partial_advance' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                  }`}>
                    {paymentOption === 'partial_advance' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {language === 'bn' ? 'আংশিক অগ্রিম (স্মার্ট সিওডি)' : 'Advance Delivery Fee'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {language === 'bn'
                    ? 'অর্ডার নিশ্চিত করতে শুধু ডেলিভারি চার্জ অগ্রিম দিন, বাকি টাকা প্রোডাক্ট হাতে পেয়ে পরিশোধ করুন।'
                    : 'Pay only the shipping fee upfront to confirm booking; pay the product price on doorstep COD.'}
                </p>
                <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-semibold">Pay Now: {formatBDT(advancePayableAmount, language)}</span>
                </div>
              </div>

              {/* Option A: Full Upfront Payment */}
              <div
                onClick={() => setPaymentOption('full_payment')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  paymentOption === 'full_payment'
                    ? 'card-bg gold-border shadow-lg shadow-[#D4AF37]/10'
                    : 'slate-bg border-[#22222E] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentOption === 'full_payment' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                  }`}>
                    {paymentOption === 'full_payment' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {language === 'bn' ? 'সম্পূর্ণ অগ্রিম পেমেন্ট' : '100% Full Payment'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {language === 'bn'
                    ? 'বিকাশ, নগদ বা রকেটের মাধ্যমে ১০০% পরিশোধ করে ভিআইপি অগ্রাধিকার ডিসপ্যাচ পান।'
                    : 'Settle the entire invoice now via bKash/Nagad for instant express VIP dispatch.'}
                </p>
                <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[11px] font-mono">
                  <span className="gold-text font-semibold">Pay Now: {formatBDT(totalAmount, language)}</span>
                </div>
              </div>

              {/* Option C: Direct 100% Cash on Delivery */}
              <div
                onClick={() => setPaymentOption('cod')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  paymentOption === 'cod'
                    ? 'card-bg gold-border shadow-lg shadow-[#D4AF37]/10'
                    : 'slate-bg border-[#22222E] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentOption === 'cod' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                  }`}>
                    {paymentOption === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Direct Cash on Delivery'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {language === 'bn'
                    ? 'ডেলিভারি এজেন্টের মাধ্যমে প্রোডাক্ট পাওয়ার পর সম্পূর্ণ মূল্য ক্যাশ পরিশোধ করুন।'
                    : 'Pay 100% cash upon courier arrival following automated phone order validation.'}
                </p>
                <div className="mt-3 pt-2 border-t border-white/5 flex justify-between text-[11px] font-mono">
                  <span className="text-gray-300">Pay on Delivery</span>
                </div>
              </div>
            </div>

            {/* MFS Verification Form (Shown when Full or Partial Advance is active) */}
            {(paymentOption === 'full_payment' || paymentOption === 'partial_advance') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-5 sm:p-6 rounded-2xl bg-[#121218] border border-[#2A2A36] space-y-5"
              >
                {activeMfsList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center space-y-2">
                    <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                    <p className="text-xs font-semibold text-amber-200">
                      {language === 'bn' 
                        ? 'মোবাইল ওয়ালেট পেমেন্ট সাময়িকভাবে বন্ধ রয়েছে। দয়া করে ক্যাশ অন ডেলিভারি বেছে নিন।' 
                        : 'MFS Wallet payment is temporarily under maintenance. Please select Cash on Delivery.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPaymentOption('cod')}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:brightness-110"
                    >
                      {language === 'bn' ? 'ক্যাশ অন ডেলিভারি নির্বাচন করুন' : 'Switch to Cash on Delivery'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider gold-text flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        {language === 'bn' ? 'মোবাইল ওয়ালেট নির্বাচন করুন' : 'Select Mobile Financial Gateway'}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                        Payable Now: {formatBDT(advancePayableAmount, language)}
                      </span>
                    </div>

                    {/* Gateway Switchers: Dynamically rendered based on Firestore Active status */}
                    <div className={`grid gap-2.5 ${activeMfsList.length === 1 ? 'grid-cols-1' : activeMfsList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {activeMfsList.map((mfsKey) => {
                        const isSelected = selectedMfs === mfsKey;
                        const gw = MFS_GATEWAYS[mfsKey] || currentMfs;
                        const dynConfig = paymentSettings?.gateways?.[mfsKey];
                        const accountTypeLabel = (dynConfig?.accountType || 'personal') === 'personal' ? 'Personal' : (dynConfig?.accountType === 'agent' ? 'Agent' : 'Merchant');

                        return (
                          <button
                            type="button"
                            key={mfsKey}
                            onClick={() => setSelectedMfs(mfsKey)}
                            className={`min-h-[58px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 relative ${
                              isSelected
                                ? 'border-[#D4AF37] bg-[#1C1C26] shadow-lg shadow-[#D4AF37]/15 ring-2 ring-[#D4AF37]/40'
                                : 'border-white/5 bg-[#161620] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider"
                                style={{ color: gw.themeColor, backgroundColor: gw.accentBg }}
                              >
                                {gw.iconText}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                                {accountTypeLabel}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {gw.ussdCode}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* STRICT "SEND MONEY ONLY" BANNER */}
                    {(paymentSettings?.sendMoneyStrictRule !== false || currentMfs.sendMoneyOnly) && (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#1E1A14] to-amber-500/10 border-2 border-amber-500/40 shadow-lg flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                              STRICT RULE
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-amber-300 font-sans">
                              {language === 'bn' 
                                ? 'শুধুমাত্র সেন্ড মানি (Send Money) প্রযোজ্য' 
                                : 'Strictly Send Money (সেন্ড মানি) Only'}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
                            {language === 'bn'
                              ? 'মার্চেন্ট পেমেন্ট (Make Payment) বা ক্যাশ আউট করবেন না। বিকাশ, নগদ বা রকেট অ্যাপে "সেন্ড মানি" অপশন সিলেক্ট করে নিচের পার্সোনাল নম্বরে টাকা পাঠান।'
                              : 'Merchant Payments (Make Payment) are NOT supported. You must choose "Send Money" in your bKash / Nagad / Rocket App to the personal number below.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Official Number Strip with Quick Copy */}
                    <div className="p-4 rounded-xl slate-bg border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase font-mono text-gray-400">
                            Luxora BD Official {currentMfs.nameEn}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-semibold uppercase">
                            {currentMfs.accountType === 'personal' ? (language === 'bn' ? 'পার্সোনাল' : 'Personal') : (language === 'bn' ? 'এজেন্ট' : 'Agent')}
                          </span>
                        </div>
                        <span className="text-base sm:text-xl font-mono font-bold text-white tracking-wider block">
                          {currentMfs.accountNumber}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyMfsNumber}
                        className="min-h-[44px] self-stretch sm:self-auto px-5 py-2.5 rounded-xl gold-bg text-black text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 cursor-pointer shadow-md transition-all"
                      >
                        {copiedNumber ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedNumber ? (language === 'bn' ? 'কপি হয়েছে!' : 'Copied!') : (language === 'bn' ? 'নম্বর কপি করুন' : 'Copy Number')}</span>
                      </button>
                    </div>

                    {/* Step-by-Step Instructions Accordion */}
                    <div className="text-xs space-y-1.5 bg-black/40 p-4 rounded-xl border border-white/5">
                      <span className="font-semibold text-gray-300 block mb-1">
                        {language === 'bn' ? 'পেমেন্ট নির্দেশিকা (ধাপসমূহ):' : 'Payment Instructions (Step-by-Step):'}
                      </span>
                      {(language === 'bn' ? currentMfs.instructionsBn : currentMfs.instructionsEn).map((step, idx) => {
                        const formattedStep = step
                          .replace('{accountNumber}', currentMfs.accountNumber)
                          .replace('{amount}', formatBDT(advancePayableAmount, language));

                        return (
                          <div key={idx} className="flex items-start gap-2 text-gray-300 text-[11px] leading-relaxed">
                            <span className="text-[#D4AF37] font-mono font-bold shrink-0">{idx + 1}.</span>
                            <span>{formattedStep}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Sender Number & Transaction ID Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sender Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      {language === 'bn' ? 'প্রেরকের মোবাইল নম্বর *' : 'Sender MFS Number *'}
                    </label>
                    <input
                      type="tel"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className={`w-full bg-[#161620] border ${
                        formErrors.senderNumber ? 'border-red-500/80' : 'border-[#2A2A36]'
                      } rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono`}
                    />
                    {formErrors.senderNumber && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.senderNumber}
                      </span>
                    )}
                  </div>

                  {/* Transaction ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      {language === 'bn' ? 'ট্রানজেকশন আইডি (TrxID) *' : 'Transaction ID (TrxID) *'}
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                      placeholder={currentMfs.trxIdFormatHint}
                      className={`w-full bg-[#161620] border ${
                        formErrors.transactionId ? 'border-red-500/80' : 'border-[#2A2A36]'
                      } rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono tracking-wider uppercase`}
                    />
                    {formErrors.transactionId && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.transactionId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Screenshot Proof Uploader */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-300">
                    {language === 'bn' ? 'পেমেন্ট স্ক্রিনশট আপলোড (ঐচ্ছিক কিন্তু দ্রুত ভেরিফিকেশনের জন্য প্রস্তাবিত)' : 'Payment Screenshot Proof (Optional - Accelerates Verification)'}
                  </label>

                  {screenshotPreview ? (
                    <div className="p-3 rounded-xl bg-[#161620] border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={screenshotPreview}
                          alt="Proof preview"
                          className="w-12 h-12 object-cover rounded-lg border border-white/20"
                        />
                        <div>
                          <span className="text-xs font-semibold text-white block truncate max-w-xs">
                            {screenshotFile?.name}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Ready for secure verification
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-[#2A2A36] hover:border-[#D4AF37]/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-[#14141C]">
                      <Upload className="w-6 h-6 text-gray-500" />
                      <div>
                        <span className="text-xs font-semibold text-gray-300 block">
                          {language === 'bn' ? 'স্ক্রিনশট সিলেক্ট করুন বা ড্র্যাগ করুন' : 'Click to attach payment receipt'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          PNG, JPG up to 5MB
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl p-6 space-y-5 shadow-2xl sticky top-24">
            <h3 className="text-base font-bold text-white font-sans pb-3 border-b border-[#20202A] flex items-center justify-between">
              <span>{language === 'bn' ? 'অর্ডার সামারি' : 'Order Summary'}</span>
              <span className="text-xs font-mono font-normal text-gray-400">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </h3>

            {/* Mini Items List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.product.image}
                      alt={item.product.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-cover rounded-lg bg-black shrink-0 border border-white/10"
                    />
                    <div className="truncate">
                      <span className="font-semibold text-white block truncate">
                        {language === 'bn' ? item.product.nameBn : item.product.nameEn}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Qty: {item.quantity} {item.selectedColor ? `• ${item.selectedColor}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-gray-300 whitespace-nowrap">
                    {formatBDT(item.product.price * item.quantity, language)}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo Code Input Box */}
            <div className="pt-3 border-t border-[#20202A]">
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold font-mono">{appliedPromo}</span>
                    <span className="text-[11px] text-emerald-400">(-{formatBDT(promoDiscount, language)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-gray-400 hover:text-red-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Voucher: LUXORA10"
                    className="flex-1 bg-[#121218] border border-[#2A2A36] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="slate-bg border border-white/10 hover:border-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    {language === 'bn' ? 'প্রয়োগ' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 text-xs pt-2 border-t border-[#20202A]">
              <div className="flex justify-between text-gray-400">
                <span>{language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono text-white">{formatBDT(cartSubtotal, language)}</span>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>{language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span>
                <span className="font-mono text-emerald-400">
                  {effectiveDeliveryCharge === 0 ? (language === 'bn' ? 'ফ্রি ডেলিভারি' : 'FREE') : formatBDT(effectiveDeliveryCharge, language)}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>{language === 'bn' ? 'ভাউচার ডিসকাউন্ট' : 'Voucher Discount'}</span>
                  <span className="font-mono">- {formatBDT(promoDiscount, language)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#20202A] flex justify-between text-base font-bold text-white">
                <span>{language === 'bn' ? 'মোট প্রদেয়' : 'Total Invoice'}</span>
                <span className="text-lg gold-text font-mono">{formatBDT(totalAmount, language)}</span>
              </div>

              {/* Partial Payment Live Box */}
              {paymentOption === 'partial_advance' && (
                <div className="mt-3 p-3 rounded-xl bg-[#14141C] border border-[#D4AF37]/30 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Pay Now (MFS Advance):</span>
                    <span>{formatBDT(advancePayableAmount, language)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-semibold text-[11px]">
                    <span>Due on Delivery (COD):</span>
                    <span>{formatBDT(dueOnDeliveryAmount, language)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Order Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl gold-bg text-black text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'অর্ডার প্রসেস হচ্ছে...' : 'Registering Order...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {paymentOption === 'partial_advance'
                      ? (language === 'bn' ? 'অগ্রিম চার্জ দিয়ে অর্ডার নিশ্চিত করুন' : 'Confirm Order with Advance Charge')
                      : paymentOption === 'full_payment'
                      ? (language === 'bn' ? 'সম্পূর্ণ পেমেন্টে অর্ডার সম্পন্ন করুন' : 'Complete Full Payment Order')
                      : (language === 'bn' ? 'ক্যাশ অন ডেলিভারিতে অর্ডার নিশ্চিত করুন' : 'Confirm Cash on Delivery Order')}
                  </span>
                </>
              )}
            </button>

            {/* Guarantees */}
            <div className="space-y-2 pt-2 text-[11px] text-gray-400 border-t border-[#20202A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text" />
                <span>100% Genuine Sealed Unit Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text" />
                <span>7 Days Return & Replacement Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text" />
                <span>Official Warranty Card Included</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        order={confirmedOrder}
        onClose={() => {
          setIsConfirmationOpen(false);
          setActiveView('store');
        }}
        onContinueShopping={() => {
          setIsConfirmationOpen(false);
          setActiveView('store');
        }}
        onViewOrders={() => {
          setIsConfirmationOpen(false);
          setActiveView('account');
        }}
      />
    </div>
  );
};
