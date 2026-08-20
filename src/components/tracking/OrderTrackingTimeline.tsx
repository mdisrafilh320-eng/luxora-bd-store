import React from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  CheckCircle2, 
  Package, 
  Truck, 
  Home, 
  AlertCircle,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { Order, OrderStatus, Language } from '../../types';

interface OrderTrackingTimelineProps {
  order: Order;
  language: Language;
}

interface StepConfig {
  key: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  icon: React.ReactNode;
  statusMatch: (status: OrderStatus) => 'completed' | 'active' | 'upcoming';
}

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({ order, language }) => {
  const currentStatus = order.orderStatus;

  const steps: StepConfig[] = [
    {
      key: 'pending',
      titleEn: 'Order Received',
      titleBn: 'অর্ডার নিবন্ধিত',
      descEn: 'Order placed & awaiting verification',
      descBn: 'অর্ডার গৃহীত হয়েছে ও ভেরিফিকেশন চলছে',
      icon: <Clock className="w-4 h-4" />,
      statusMatch: (st) => {
        if (st === 'Cancelled') return 'upcoming';
        return st === 'Pending' ? 'active' : 'completed';
      },
    },
    {
      key: 'payment_verified',
      titleEn: 'Payment Verified',
      titleBn: 'পেমেন্ট নিশ্চিত',
      descEn: order.paymentOption === 'partial_advance' 
        ? 'Advance delivery fee verified via MFS' 
        : order.paymentMethod === 'cod' 
        ? 'Cash on delivery terms confirmed' 
        : 'Full digital payment verified',
      descBn: order.paymentOption === 'partial_advance'
        ? 'বিকাশ/নগদে অগ্রিম চার্জ নিশ্চিত হয়েছে'
        : order.paymentMethod === 'cod'
        ? 'ক্যাশ অন ডেলিভারি নিশ্চিত হয়েছে'
        : 'সম্পূর্ণ পেমেন্ট ভেরিফাই হয়েছে',
      icon: <CreditCard className="w-4 h-4" />,
      statusMatch: (st) => {
        if (st === 'Cancelled' || st === 'Pending') return 'upcoming';
        if (st === 'Confirmed') return 'active';
        return 'completed';
      },
    },
    {
      key: 'packaging',
      titleEn: 'Vault Packaging',
      titleBn: 'সিকিউরিটি প্যাকিং',
      descEn: 'Multi-layer tamper-proof seal in Banani Vault',
      descBn: 'বনানী ভল্ট থেকে টেম্পার-প্রুফ সিল্ড প্যাকিং সম্পন্ন',
      icon: <Package className="w-4 h-4" />,
      statusMatch: (st) => {
        if (st === 'Pending' || st === 'Confirmed' || st === 'Cancelled') return 'upcoming';
        if (st === 'Processing') return 'active';
        return 'completed';
      },
    },
    {
      key: 'in_transit',
      titleEn: 'In Courier Transit',
      titleBn: 'কুরিয়ারে হস্তান্তর',
      descEn: `Dispatched via ${order.trackingInfo?.courier || 'Steadfast Luxury Express'}`,
      descBn: `${order.trackingInfo?.courier || 'স্টেডফাস্ট এক্সপ্রেস'} এর মাধ্যমে আপনার ঠিকানায় প্রেরিত`,
      icon: <Truck className="w-4 h-4" />,
      statusMatch: (st) => {
        if (st === 'In Transit' || st === 'Shipped') return 'active';
        if (st === 'Delivered') return 'completed';
        return 'upcoming';
      },
    },
    {
      key: 'delivered',
      titleEn: 'Delivered & Inspected',
      titleBn: 'ডেলিভারি সম্পন্ন',
      descEn: 'Handed over at doorstep with warranty card',
      descBn: 'ওয়ারেন্টি কার্ড সহ সফলভাবে ডেলিভারি সম্পন্ন',
      icon: <Home className="w-4 h-4" />,
      statusMatch: (st) => {
        return st === 'Delivered' ? 'completed' : 'upcoming';
      },
    },
  ];

  if (currentStatus === 'Cancelled') {
    return (
      <div className="p-5 rounded-2xl bg-red-950/30 border border-red-800/40 flex items-center gap-3 text-red-300 text-sm">
        <AlertCircle className="w-6 h-6 shrink-0 text-red-400" />
        <div>
          <h4 className="font-bold">{language === 'bn' ? 'অর্ডারটি বাতিল করা হয়েছে' : 'Order Cancelled'}</h4>
          <p className="text-xs text-red-400/80 mt-0.5">
            {language === 'bn' 
              ? 'যেকোনো প্রয়োজনে আমাদের ২৪/৭ এআই বা কাস্টমার কেয়ারে যোগাযোগ করুন।' 
              : 'For inquiries or refund assistance, please connect with our 24/7 concierge.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-2">
      {/* Desktop Progress Bar Line */}
      <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-0.5 bg-[#20202A] z-0">
        <div 
          className="h-full gold-bg transition-all duration-700"
          style={{
            width: currentStatus === 'Delivered' ? '100%'
              : currentStatus === 'In Transit' || currentStatus === 'Shipped' ? '75%'
              : currentStatus === 'Processing' ? '50%'
              : currentStatus === 'Confirmed' ? '25%'
              : '5%'
          }}
        />
      </div>

      {/* Desktop Step Grid */}
      <div className="hidden md:grid grid-cols-5 gap-3 relative z-10">
        {steps.map((step, idx) => {
          const status = step.statusMatch(currentStatus);
          const isCompleted = status === 'completed';
          const isActive = status === 'active';

          return (
            <div key={step.key} className="flex flex-col items-center text-center">
              {/* Step Circle Icon */}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 mb-3 ${
                  isCompleted 
                    ? 'gold-bg text-black shadow-lg shadow-[#D4AF37]/25' 
                    : isActive 
                    ? 'bg-[#181822] text-[#D4AF37] border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/30 scale-110' 
                    : 'bg-[#121218] text-gray-600 border border-[#262634]'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
              </div>

              {/* Status Badge */}
              <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${
                isCompleted 
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' 
                  : isActive 
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 animate-pulse' 
                  : 'bg-white/5 text-gray-500'
              }`}>
                {isCompleted 
                  ? (language === 'bn' ? 'সম্পন্ন' : 'Complete') 
                  : isActive 
                  ? (language === 'bn' ? 'চলমান' : 'Live Now') 
                  : `0${idx + 1}`}
              </span>

              <h4 className={`text-xs font-bold font-luxury ${isActive ? 'gold-text' : isCompleted ? 'text-white' : 'text-gray-500'}`}>
                {language === 'bn' ? step.titleBn : step.titleEn}
              </h4>
              <p className="text-[11px] text-gray-400 mt-1 leading-snug max-w-[140px]">
                {language === 'bn' ? step.descBn : step.descEn}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile Vertical Step Timeline */}
      <div className="md:hidden space-y-4">
        {steps.map((step, idx) => {
          const status = step.statusMatch(currentStatus);
          const isCompleted = status === 'completed';
          const isActive = status === 'active';

          return (
            <div key={step.key} className="flex items-start gap-3.5 relative">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className={`absolute top-9 left-5 w-0.5 h-10 ${
                  isCompleted ? 'gold-bg' : 'bg-[#20202A]'
                }`} />
              )}

              {/* Icon Node */}
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                  isCompleted 
                    ? 'gold-bg text-black shadow-md shadow-[#D4AF37]/20' 
                    : isActive 
                    ? 'bg-[#181822] text-[#D4AF37] border-2 border-[#D4AF37] shadow-md shadow-[#D4AF37]/30 scale-105' 
                    : 'bg-[#121218] text-gray-600 border border-[#262634]'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold ${isActive ? 'gold-text' : isCompleted ? 'text-white' : 'text-gray-500'}`}>
                    {language === 'bn' ? step.titleBn : step.titleEn}
                  </h4>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                    isCompleted 
                      ? 'bg-emerald-950/60 text-emerald-400' 
                      : isActive 
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30' 
                      : 'text-gray-600'
                  }`}>
                    {isCompleted ? (language === 'bn' ? 'সম্পন্ন' : 'Done') : isActive ? (language === 'bn' ? 'চলমান' : 'Live') : `0${idx + 1}`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {language === 'bn' ? step.descBn : step.descEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
