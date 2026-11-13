import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Tag, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Plus, 
  Minus, 
  Trash2, 
  ShieldAlert, 
  Wallet,
  ChevronDown,
  Navigation
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../translations';
import { MFS_GATEWAYS, PROMO_CODES } from '../../data/mfsGateways';
import { BD_DIVISIONS, BD_DISTRICTS, getUpazilasForDistrict } from '../../data/bangladeshLocations';
import { PaymentMethod, PaymentOption, Order, MfsGatewayConfig } from '../../types';
import { orderService } from '../../services/orderService';
import { uploadPaymentProof } from '../../services/storageService';
import { OrderConfirmationModal } from './OrderConfirmationModal';

export const CheckoutPage: React.FC = () => {
  const { 
    cart, 
    cartSubtotal, 
    updateQuantity,
    removeFromCart,
    clearCart, 
    user, 
    language, 
    setActiveView, 
    addToast,
    paymentSettings 
  } = useApp();

  // 1. Essential Customer Dossier State
  const [fullName, setFullName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [fullAddress, setFullAddress] = useState('');

  // 2. Payment State (Strict Advance Policy - Zero-Advance COD Disallowed)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('partial_advance');
  const [selectedMfs, setSelectedMfs] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // 3. Voucher State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // 4. UI / Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active MFS gateways dynamically from Firestore settings
  const activeMfsList = (['bkash', 'nagad', 'rocket'] as const).filter((mfsKey) => {
    const config = paymentSettings?.gateways?.[mfsKey];
    return config ? config.isActive !== false : true;
  });

  useEffect(() => {
    if (activeMfsList.length > 0 && !activeMfsList.includes(selectedMfs)) {
      setSelectedMfs(activeMfsList[0]);
    }
  }, [activeMfsList, selectedMfs]);

  // Sync user profile data if available
  useEffect(() => {
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
  }, [user]);

  // Filtered Districts & Suggested Upazilas based on Division / District selection
  const filteredDistricts = selectedDivision
    ? BD_DISTRICTS.filter((d) => d.division === selectedDivision)
    : [];
  const suggestedUpazilas = getUpazilasForDistrict(selectedDistrict);

  // Dynamic Flat Delivery Charge across Bangladesh (Admin Controlled, Default: 120 BDT)
  const flatDeliveryCharge = appliedPromo === 'VIPFREESHIP' 
    ? 0 
    : (typeof paymentSettings?.flatDeliveryCharge === 'number' 
        ? paymentSettings.flatDeliveryCharge 
        : (typeof paymentSettings?.deliveryCharge === 'number' 
            ? paymentSettings.deliveryCharge 
            : 120));

  const totalAmount = Math.max(0, cartSubtotal + flatDeliveryCharge - promoDiscount);

  // Advance Payment calculation:
  // Under strict policy: customer pays either the flat delivery fee (৳120) or full payment upfront. Pure COD is restricted.
  const advancePayableAmount = paymentOption === 'full_payment' 
    ? totalAmount 
    : Math.min(totalAmount, flatDeliveryCharge > 0 ? flatDeliveryCharge : 120);

  const dueOnDeliveryAmount = paymentOption === 'full_payment' 
    ? 0 
    : Math.max(0, totalAmount - advancePayableAmount);

  // Current MFS Gateway Config
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

  const handleCopyMfsNumber = () => {
    navigator.clipboard.writeText(currentMfs.accountNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Voucher apply handler
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

  // Screenshot proof handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({
          type: 'error',
          titleEn: 'Invalid File',
          titleBn: 'ভুল ফাইল',
          descriptionEn: 'Please select a valid image screenshot (PNG, JPG, WebP).',
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

  // Strict Validation for Checkout
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = language === 'bn' ? 'গ্রাহকের নাম আবশ্যক' : 'Customer Name is required';
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!phoneNumber.trim()) {
      errors.phoneNumber = language === 'bn' ? 'মোবাইল নম্বর আবশ্যক' : 'Phone Number is required';
    } else if (cleanPhone.length < 11) {
      errors.phoneNumber = language === 'bn' ? '১১ ডিজিটের সঠিক ফোন নম্বর দিন (উদা: 017XXXXXXXX)' : 'Please enter an 11-digit mobile number';
    }

    if (!selectedDivision) {
      errors.division = language === 'bn' ? 'বিভাগ (Division) নির্বাচন করা আবশ্যক' : 'Division is required';
    }

    if (!selectedDistrict) {
      errors.district = language === 'bn' ? 'জেলা (District) নির্বাচন করা আবশ্যক' : 'District is required';
    }

    if (!upazila.trim()) {
      errors.upazila = language === 'bn' ? 'থানা / উপজেলা (Upazila) প্রদান করা আবশ্যক' : 'Upazila / Police Station is required';
    }

    if (!fullAddress.trim() || fullAddress.trim().length < 5) {
      errors.fullAddress = language === 'bn' ? 'বিস্তারিত ডেলিভারি ঠিকানা লিখুন (বাড়ি, রোড, এলাকা)' : 'Detailed delivery address (House, Road, Area) is required';
    }

    // MANDATORY ADVANCE PAYMENT VALIDATION
    const cleanSender = senderNumber.replace(/[^0-9]/g, '');
    if (!senderNumber.trim()) {
      errors.senderNumber = language === 'bn' 
        ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন (বাধ্যতামূলক)' 
        : 'Sender MFS Number is strictly mandatory';
    } else if (cleanSender.length < 11) {
      errors.senderNumber = language === 'bn' 
        ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' 
        : 'Sender number must be 11 digits';
    }

    const cleanTrx = transactionId.trim().toUpperCase();
    if (!cleanTrx) {
      errors.transactionId = language === 'bn' 
        ? 'ট্রানজেকশন আইডি (TrxID) প্রদান করা বাধ্যতামূলক' 
        : 'Transaction ID (TrxID) is strictly mandatory';
    } else if (cleanTrx.length < 5) {
      errors.transactionId = language === 'bn' 
        ? 'সঠিক TrxID দিন' 
        : 'Valid Transaction ID (minimum 5 characters) required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Order Placement with Strict Timeout & No Infinite Loading
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
        titleEn: 'Missing Mandatory Fields',
        titleBn: 'বাধ্যতামূলক তথ্য অসম্পূর্ণ',
        descriptionEn: 'Please fill in Name, Phone, Division, District, Upazila, Detailed Address, Sender Number & TrxID.',
        descriptionBn: 'নাম, ফোন, বিভাগ, জেলা, থানা, বিস্তারিত ঠিকানা এবং অগ্রিম পেমেন্টের TrxID প্রদান করুন।',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedProofUrl: string | undefined = undefined;
      let uploadedProofName: string | undefined = undefined;

      // Safely upload screenshot if provided (races against a 5-second watchdog)
      if (screenshotFile) {
        try {
          const uploadPromise = uploadPaymentProof(screenshotFile, 'TEMP-' + Date.now());
          const timeoutProof = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Screenshot upload timeout')), 5000)
          );
          const uploadResult = await Promise.race([uploadPromise, timeoutProof]);
          uploadedProofUrl = uploadResult.url;
          uploadedProofName = uploadResult.fileName;
        } catch (proofErr) {
          console.warn('Screenshot upload skipped to ensure fast order placement:', proofErr);
        }
      }

      const paymentMethodValue: PaymentMethod = selectedMfs;

      const divisionObj = BD_DIVISIONS.find((d) => d.id === selectedDivision);
      const districtObj = BD_DISTRICTS.find((d) => d.id === selectedDistrict);
      const divisionName = divisionObj ? divisionObj.nameEn : selectedDivision;
      const districtName = districtObj ? districtObj.nameEn : selectedDistrict;

      // Create Order in Firestore with timeout and auto-cache protection
      const newOrder = await orderService.createOrder({
        userId: user?.id || 'guest',
        customer: {
          name: fullName.trim(),
          phone: phoneNumber.trim(),
          email: user?.email || '',
          division: divisionName,
          district: districtName,
          upazila: upazila.trim(),
          shippingAddress: fullAddress.trim(),
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
        deliveryCharge: flatDeliveryCharge,
        discount: promoDiscount,
        promoCode: appliedPromo || '',
        totalAmount: totalAmount,
        paymentMethod: paymentMethodValue,
        paymentOption: paymentOption,
        paymentDetails: {
          method: paymentMethodValue,
          option: paymentOption,
          mfsProvider: selectedMfs,
          advanceAmount: advancePayableAmount,
          dueAmount: dueOnDeliveryAmount,
          senderNumber: senderNumber.trim(),
          transactionId: transactionId.trim().toUpperCase(),
          paymentProofUrl: uploadedProofUrl,
          paymentProofName: uploadedProofName,
          paymentTimestamp: new Date().toISOString(),
        },
        paymentStatus: paymentOption === 'partial_advance' ? 'partially_paid' : 'pending',
        orderStatus: 'Pending',
        trackingInfo: {
          courier: 'Steadfast Luxury Express',
          estimatedDelivery: '2-3 Business Days Nationwide',
        },
      });

      // Clear cart on successful order
      clearCart();
      setConfirmedOrder(newOrder);
      setIsConfirmationOpen(true);

      addToast({
        type: 'success',
        titleEn: `Order Placed Successfully: ${newOrder.id}`,
        titleBn: `অর্ডার নিশ্চিত হয়েছে: ${newOrder.id}`,
        descriptionEn: `Your order of ${formatBDT(totalAmount, 'en')} has been registered.`,
        descriptionBn: `আপনার ${formatBDT(totalAmount, 'bn')} টাকার অর্ডার সফলভাবে গৃহীত হয়েছে।`,
      });

    } catch (error: any) {
      console.error('Order placement error:', error);
      addToast({
        type: 'error',
        titleEn: 'Order Submission Issue',
        titleBn: 'অর্ডার প্রক্রিয়াকরণে সমস্যা',
        descriptionEn: error?.message || 'Could not place order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart view
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
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-28 md:py-10 text-[#EDEDED]">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setActiveView('store')}
        className="min-h-[44px] text-xs text-gray-400 hover:text-white inline-flex items-center gap-2 mb-4 sm:mb-6 transition-colors cursor-pointer px-2 -ml-2 rounded-lg hover:bg-white/5"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{language === 'bn' ? 'কেনাকাটায় ফিরে যান' : 'Back to Boutique'}</span>
      </button>

      {/* Header Banner */}
      <div className="card-bg border border-[#22222E] rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 inset-x-0 h-1 gold-bg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase font-mono gold-text font-bold mb-1">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Fast & Secure Checkout</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold font-luxury tracking-wide text-white">
            {language === 'bn' ? 'অর্ডার কনফার্মেশন ফর্ম' : 'Order Confirmation & Checkout'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {language === 'bn' 
              ? 'অগ্রিম ডেলিভারি চার্জ নিশ্চিত করে সারাদেশে দ্রুততম এক্সপ্রেস কুরিয়ারে পণ্য বুঝে নিন।'
              : 'Complete your purchase with flat nationwide delivery & instant advance payment verification.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-mono font-bold text-[#D4AF37] flex items-center gap-2 tabular-nums">
            <Truck className="w-4 h-4 shrink-0" />
            <span>{language === 'bn' ? `ডেলিভারি চার্জ: ৳${flatDeliveryCharge}` : `Flat Delivery: ৳${flatDeliveryCharge}`}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Essential Details + Advance Payment (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* SECTION 1: ESSENTIAL CUSTOMER DETAILS (STREAMLINED) */}
          <div className="card-bg border border-[#22222E] rounded-2xl p-4 sm:p-6 lg:p-7 space-y-5 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#20202A]">
              <div className="w-7 h-7 rounded-full gold-bg text-black flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white">
                  {language === 'bn' ? 'গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা' : 'Customer & Delivery Address'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'পণ্য প্রেরণের জন্য নাম, মোবাইল নম্বর এবং ঠিকানা দিন' : 'Enter your name, active mobile number, and full delivery address'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'আপনার নাম *' : 'Customer Full Name *'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className={`w-full min-h-[46px] bg-[#121218] border ${
                      formErrors.fullName ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl pl-10 pr-4 py-3 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors`}
                  />
                </div>
                {formErrors.fullName && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.fullName}
                  </span>
                )}
              </div>

              {/* Mobile Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Phone Number (11 Digits) *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className={`w-full min-h-[46px] bg-[#121218] border ${
                      formErrors.phoneNumber ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl pl-10 pr-4 py-3 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono transition-colors`}
                  />
                </div>
                {formErrors.phoneNumber && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.phoneNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Structured Bangladesh Location Fields: Division, District, Upazila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Division (বিভাগ) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'বিভাগ (Division) *' : 'Division (বিভাগ) *'}
                </label>
                <div className="relative">
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      const divId = e.target.value;
                      setSelectedDivision(divId);
                      setSelectedDistrict('');
                      setUpazila('');
                      setFormErrors((prev) => ({
                        ...prev,
                        division: '',
                        district: '',
                        upazila: '',
                      }));
                    }}
                    className={`w-full min-h-[46px] appearance-none bg-[#121218] border ${
                      formErrors.division ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl pl-3.5 pr-9 py-3 text-base sm:text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer`}
                  >
                    <option value="" className="bg-[#121218] text-gray-400">
                      {language === 'bn' ? 'বিভাগ বেছে নিন' : 'Select Division'}
                    </option>
                    {BD_DIVISIONS.map((div) => (
                      <option key={div.id} value={div.id} className="bg-[#121218] text-white">
                        {language === 'bn' ? `${div.nameBn} (${div.nameEn})` : `${div.nameEn} (${div.nameBn})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formErrors.division && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.division}
                  </span>
                )}
              </div>

              {/* District (জেলা) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'জেলা (District) *' : 'District (জেলা) *'}
                </label>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    disabled={!selectedDivision}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setUpazila('');
                      setFormErrors((prev) => ({ ...prev, district: '', upazila: '' }));
                    }}
                    className={`w-full min-h-[46px] appearance-none bg-[#121218] border ${
                      formErrors.district ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl pl-3.5 pr-9 py-3 text-base sm:text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="" className="bg-[#121218] text-gray-400">
                      {!selectedDivision
                        ? (language === 'bn' ? 'আগে বিভাগ বেছে নিন' : 'Select Division first')
                        : (language === 'bn' ? 'জেলা বেছে নিন' : 'Select District')}
                    </option>
                    {filteredDistricts.map((dist) => (
                      <option key={dist.id} value={dist.id} className="bg-[#121218] text-white">
                        {language === 'bn' ? `${dist.nameBn} (${dist.nameEn})` : `${dist.nameEn} (${dist.nameBn})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formErrors.district && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.district}
                  </span>
                )}
              </div>

              {/* Upazila / Police Station (থানা / উপজেলা) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  {language === 'bn' ? 'থানা / উপজেলা (Upazila) *' : 'Upazila / Thana (থানা) *'}
                </label>
                <div className="relative">
                  <Navigation className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    list="bd-upazila-options"
                    value={upazila}
                    onChange={(e) => {
                      setUpazila(e.target.value);
                      if (formErrors.upazila) {
                        setFormErrors((prev) => ({ ...prev, upazila: '' }));
                      }
                    }}
                    placeholder={language === 'bn' ? 'থানা বা উপজেলার নাম লিখুন' : 'e.g. Banani, Savar, Sadar'}
                    className={`w-full min-h-[46px] bg-[#121218] border ${
                      formErrors.upazila ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl pl-9 pr-3.5 py-3 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors`}
                  />
                  <datalist id="bd-upazila-options">
                    {suggestedUpazilas.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                {formErrors.upazila && (
                  <span className="text-[11px] text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.upazila}
                  </span>
                )}
              </div>
            </div>

            {/* Detailed Delivery Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                {language === 'bn' ? 'বিস্তারিত ডেলিভারি ঠিকানা (বাড়ি, রোড, গ্রাম/এলাকা) *' : 'Detailed Delivery Address (House, Road, Area/Village) *'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-500 pointer-events-none" />
                <textarea
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => {
                    setFullAddress(e.target.value);
                    if (formErrors.fullAddress) {
                      setFormErrors((prev) => ({ ...prev, fullAddress: '' }));
                    }
                  }}
                  placeholder={language === 'bn' ? 'বাড়ি/ফ্ল্যাট নং, রোড নং, গ্রাম বা এলাকার বিস্তারিত ঠিকানা লিখুন' : 'House #, Flat #, Road #, Block, Area or Village'}
                  className={`w-full bg-[#121218] border ${
                    formErrors.fullAddress ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                  } rounded-xl pl-10 pr-4 py-3 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors`}
                />
              </div>
              {formErrors.fullAddress && (
                <span className="text-[11px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.fullAddress}
                </span>
              )}
            </div>
          </div>

          {/* SECTION 2: ORDER ITEMS & QUANTITY CONTROLS */}
          <div className="card-bg border border-[#22222E] rounded-2xl p-4 sm:p-6 lg:p-7 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#20202A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full gold-bg text-black flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <h3 className="text-base font-bold text-white truncate">
                  {language === 'bn' ? 'অর্ডারের পণ্য ও পরিমাণ' : 'Products & Quantity'}
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-mono tabular-nums shrink-0">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="divide-y divide-white/5 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id + (item.selectedColor || '')} className="pt-3 first:pt-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.product.image}
                      alt={item.product.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded-xl bg-black border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                        {language === 'bn' ? item.product.nameBn : item.product.nameEn}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span className="gold-text font-mono font-bold tabular-nums">
                          {formatBDT(item.product.price, language)}
                        </span>
                        {item.selectedColor && (
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-300 truncate">
                            {item.selectedColor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <div className="flex items-center bg-[#161620] border border-[#2A2A36] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="min-w-[38px] min-h-[38px] flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-mono font-bold text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="min-w-[38px] min-h-[38px] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: ADVANCE PAYMENT & VERIFICATION (NO 0% ADVANCE COD) */}
          <div className="card-bg border border-[#22222E] rounded-2xl p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6 shadow-xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#20202A]">
              <div className="w-7 h-7 rounded-full gold-bg text-black flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'bn' ? 'অগ্রিম পেমেন্ট ও ভেরিফিকেশন' : 'Advance Payment & Verification'}
                </h3>
                <p className="text-xs text-gray-400">
                  {language === 'bn' ? 'ডেলিভারি চার্জ অথবা সম্পূর্ণ মূল্য অগ্রিম প্রদান বাধ্যতামূলক' : 'Advance payment of delivery charge or full amount is strictly mandatory'}
                </p>
              </div>
            </div>

            {/* MANDATORY ADVANCE SECURITY BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#1E1C16] to-[#D4AF37]/10 border-2 border-[#D4AF37]/50 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] text-black">
                    {language === 'bn' ? 'বাধ্যতামূলক নীতি' : 'MANDATORY POLICY'}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {language === 'bn' 
                      ? `অগ্রিম ডেলিভারি চার্জ (৳${flatDeliveryCharge}) পরিশোধ ছাড়া অর্ডার গ্রহণযোগ্য নয়` 
                      : `Advance Delivery Fee (৳${flatDeliveryCharge}) is Strictly Required`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  {language === 'bn'
                    ? `ফেক অর্ডার প্রতিরোধে সারাদেশে ফ্ল্যাট ৳${flatDeliveryCharge} ডেলিভারি চার্জ বিকাশ, নগদ বা রকেটে অগ্রিম প্রদান এবং TrxID দেওয়া বাধ্যতামূলক। মূল পণ্যের বাকি মূল্য ক্যাশ অন ডেলিভারিতে প্রোডাক্ট হাতে পেয়ে পরিশোধ করবেন।`
                    : `To verify order authenticity, paying the flat delivery charge (৳${flatDeliveryCharge}) in advance with a valid TrxID is required. The product balance is paid upon doorstep delivery.`}
                </p>
              </div>
            </div>

            {/* Payment Options: Advance Options Only */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option A: Partial Advance (Recommended) */}
              <div
                onClick={() => setPaymentOption('partial_advance')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  paymentOption === 'partial_advance'
                    ? 'card-bg border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/10'
                    : 'bg-[#121218] border-[#22222E] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentOption === 'partial_advance' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                    }`}>
                      {paymentOption === 'partial_advance' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {language === 'bn' ? 'অগ্রিম ডেলিভারি চার্জ + বাকি COD' : 'Advance Delivery Fee + COD'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] text-black">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">
                  {language === 'bn' 
                    ? `এখন শুধু ৳${flatDeliveryCharge} অগ্রিম দিয়ে অর্ডার লক করুন। বাকি টাকা প্রোডাক্ট বুঝে পেয়ে পরিশোধ করবেন।`
                    : `Pay only ৳${flatDeliveryCharge} now to secure delivery; settle balance upon receiving item.`}
                </p>
                <div className="pt-2 border-t border-white/5 flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">Now: {formatBDT(advancePayableAmount, language)}</span>
                  <span className="text-amber-400 font-semibold">COD: {formatBDT(dueOnDeliveryAmount, language)}</span>
                </div>
              </div>

              {/* Option B: Full Payment (100% Upfront) */}
              <div
                onClick={() => setPaymentOption('full_payment')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                  paymentOption === 'full_payment'
                    ? 'card-bg border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/10'
                    : 'bg-[#121218] border-[#22222E] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentOption === 'full_payment' ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-gray-500'
                    }`}>
                      {paymentOption === 'full_payment' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {language === 'bn' ? '১০০% সম্পূর্ণ অগ্রিম পেমেন্ট' : '100% Full Payment Upfront'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black">
                    VIP EXPRESS
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mb-2">
                  {language === 'bn' 
                    ? 'সম্পূর্ণ টাকা অগ্রিম দিয়ে অগ্রাধিকার ডেলিভারি উপভোগ করুন। কুরিয়ারে কোনো নগদ টাকা দিতে হবে না।'
                    : 'Pay 100% now for express dispatch. Zero cash exchange at doorstep.'}
                </p>
                <div className="pt-2 border-t border-white/5 flex justify-between text-xs font-mono">
                  <span className="gold-text font-bold">Now: {formatBDT(totalAmount, language)}</span>
                  <span className="text-gray-400 font-semibold">COD: ৳0</span>
                </div>
              </div>
            </div>

            {/* MFS Wallet Selection */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#121218] border border-[#2A2A36] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider gold-text flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'পেমেন্ট ওয়ালেট বেছে নিন:' : 'Select Payment Wallet:'}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  Pay Now: {formatBDT(advancePayableAmount, language)}
                </span>
              </div>

              {/* Gateway Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                {(['bkash', 'nagad', 'rocket'] as const).map((mfsKey) => {
                  const isSelected = selectedMfs === mfsKey;
                  const gw = MFS_GATEWAYS[mfsKey] || currentMfs;
                  const dynConfig = paymentSettings?.gateways?.[mfsKey];
                  const isGwActive = dynConfig ? dynConfig.isActive !== false : true;

                  if (!isGwActive) return null;

                  return (
                    <button
                      type="button"
                      key={mfsKey}
                      onClick={() => setSelectedMfs(mfsKey)}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#1C1C26] ring-2 ring-[#D4AF37]/30 shadow-md'
                          : 'border-white/5 bg-[#161620] hover:border-white/20'
                      }`}
                    >
                      <span 
                        className="text-xs font-black px-2 py-0.5 rounded uppercase"
                        style={{ color: gw.themeColor, backgroundColor: gw.accentBg }}
                      >
                        {gw.iconText}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {gw.ussdCode}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Strict Send Money Note */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {language === 'bn' 
                    ? 'শুধুমাত্র "Send Money" (সেন্ড মানি) করুন। মার্চেন্ট পেমেন্ট বা ক্যাশ আউট প্রযোজ্য নয়।' 
                    : 'Strictly use "Send Money". Merchant Make-Payment or Cash-Out is not supported.'}
                </span>
              </div>

              {/* Official Number Strip with Quick Copy */}
              <div className="p-3.5 rounded-xl bg-[#181824] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono text-gray-400 block mb-0.5">
                    Luxora BD Official {currentMfs.nameEn} ({currentMfs.accountType})
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                    {currentMfs.accountNumber}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMfsNumber}
                  className="px-4 py-2 rounded-xl gold-bg text-black text-xs font-bold flex items-center gap-1.5 hover:brightness-110 active:scale-95 cursor-pointer shadow transition-all shrink-0"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNumber ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied') : (language === 'bn' ? 'কপি করুন' : 'Copy')}</span>
                </button>
              </div>

              {/* MANDATORY INPUTS: Sender Number & TrxID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Sender Mobile Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300">
                    {language === 'bn' ? 'প্রেরকের মোবাইল নম্বর * (বাধ্যতামূলক)' : 'Sender MFS Number * (Mandatory)'}
                  </label>
                  <input
                    type="tel"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className={`w-full min-h-[46px] bg-[#161620] border ${
                      formErrors.senderNumber ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl px-4 py-2.5 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono`}
                  />
                  {formErrors.senderNumber && (
                    <span className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.senderNumber}
                    </span>
                  )}
                </div>

                {/* Transaction ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-300">
                    {language === 'bn' ? 'ট্রানজেকশন আইডি (TrxID) * (বাধ্যতামূলক)' : 'Transaction ID (TrxID) * (Mandatory)'}
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                    placeholder={currentMfs.trxIdFormatHint}
                    className={`w-full min-h-[46px] bg-[#161620] border ${
                      formErrors.transactionId ? 'border-red-500/80 ring-1 ring-red-500/50' : 'border-[#2A2A36]'
                    } rounded-xl px-4 py-2.5 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono tracking-wider uppercase`}
                  />
                  {formErrors.transactionId && (
                    <span className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.transactionId}
                    </span>
                  )}
                </div>
              </div>

              {/* Optional Screenshot Attachment */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-gray-400">
                  {language === 'bn' ? 'পেমেন্ট স্ক্রিনশট (ঐচ্ছিক)' : 'Payment Screenshot (Optional)'}
                </label>
                {screenshotPreview ? (
                  <div className="p-2.5 rounded-xl bg-[#161620] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={screenshotPreview} alt="Receipt preview" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      <span className="text-xs text-white truncate max-w-[200px]">{screenshotFile?.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 cursor-pointer"
                      aria-label="Remove screenshot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="min-h-[46px] border border-dashed border-[#2A2A36] hover:border-[#D4AF37]/50 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-[#14141C]">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {language === 'bn' ? 'রসিদের ছবি যুক্ত করুন (ঐচ্ছিক)' : 'Attach Receipt Screenshot (Optional)'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Placement (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-bg border border-[#22222E] rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xl lg:sticky lg:top-24">
            <h3 className="text-base font-bold text-white pb-3 border-b border-[#20202A] flex items-center justify-between">
              <span>{language === 'bn' ? 'অর্ডার ইনভয়েস' : 'Order Invoice'}</span>
              <span className="text-xs font-mono font-normal text-emerald-400 tabular-nums">
                Nationwide ৳{flatDeliveryCharge}
              </span>
            </h3>

            {/* Voucher Box */}
            <div>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold font-mono">{appliedPromo}</span>
                    <span className="text-emerald-400 font-mono tabular-nums">(-{formatBDT(promoDiscount, language)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-red-400 cursor-pointer"
                    aria-label="Remove promo code"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Voucher: LUXORA10"
                    className="flex-1 min-h-[44px] bg-[#121218] border border-[#2A2A36] rounded-xl px-3.5 py-2 text-base sm:text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="min-h-[44px] slate-bg border border-white/10 hover:border-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    {language === 'bn' ? 'প্রয়োগ' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2.5 text-xs pt-3 border-t border-[#20202A]">
              <div className="flex justify-between text-gray-400">
                <span>{language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono text-white">{formatBDT(cartSubtotal, language)}</span>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>{language === 'bn' ? 'ফ্ল্যাট ডেলিভারি চার্জ (সারাদেশে)' : 'Flat Delivery (Nationwide)'}</span>
                <span className="font-mono text-[#D4AF37] font-semibold">
                  {flatDeliveryCharge === 0 ? (language === 'bn' ? 'ফ্রি ডেলিভারি' : 'FREE') : formatBDT(flatDeliveryCharge, language)}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>{language === 'bn' ? 'ভাউচার ছাড়' : 'Voucher Discount'}</span>
                  <span className="font-mono">- {formatBDT(promoDiscount, language)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#20202A] flex justify-between text-base font-bold text-white">
                <span>{language === 'bn' ? 'সর্বমোট' : 'Total Amount'}</span>
                <span className="text-lg gold-text font-mono">{formatBDT(totalAmount, language)}</span>
              </div>

              {/* Advance Breakdown Indicator */}
              <div className="mt-3 p-3 rounded-xl bg-[#14141C] border border-[#D4AF37]/30 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Pay Now (Advance):</span>
                  <span>{formatBDT(advancePayableAmount, language)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-semibold text-[11px]">
                  <span>Due on Delivery (COD):</span>
                  <span>{formatBDT(dueOnDeliveryAmount, language)}</span>
                </div>
              </div>
            </div>

            {/* ORDER SUBMIT BUTTON WITH WATCHDOG & NO FREEZING */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl gold-bg text-black text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{language === 'bn' ? 'অর্ডার জমা হচ্ছে...' : 'Submitting Order...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {paymentOption === 'partial_advance'
                      ? (language === 'bn' 
                          ? `অগ্রিম ৳${advancePayableAmount} দিয়ে অর্ডার কনফার্ম করুন` 
                          : `Confirm Order with ৳${advancePayableAmount} Advance`)
                      : (language === 'bn' 
                          ? `সম্পূর্ণ পেমেন্টে (${formatBDT(totalAmount, language)}) অর্ডার সম্পন্ন করুন` 
                          : `Complete Full Payment (${formatBDT(totalAmount, language)}) Order`)}
                  </span>
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="space-y-1.5 pt-3 text-[11px] text-gray-400 border-t border-[#20202A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>100% Original Sealed Box Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>Steadfast Express 2-3 Days Nationwide Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>7 Days Replacement & Official BD Warranty</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
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
