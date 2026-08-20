import React from 'react';
import { ShieldCheck, Truck, Banknote, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TrustBadges: React.FC<{ variant?: 'grid' | 'bar' | 'compact' }> = ({ variant = 'grid' }) => {
  const { t, language } = useApp();

  const trustItems = [
    {
      id: 'trust-badge-original',
      icon: ShieldCheck,
      titleBn: '১০০% আসল পণ্য',
      titleEn: '100% Original Guarantee',
      descBn: 'অফিসিয়াল ডিস্ট্রিবিউটর ও সরাসরি গ্যারান্টিযুক্ত টেক গ্যাজেট।',
      descEn: 'Authentic tech sourced directly with serial verification.',
    },
    {
      id: 'trust-badge-cod',
      icon: Banknote,
      titleBn: 'ক্যাশ অন ডেলিভারি',
      titleEn: 'Cash On Delivery',
      descBn: 'বাংলাদেশের ৬৪ জেলায় পণ্য হাতে পেয়ে নিশ্চিন্তে মূল্য পরিশোধ।',
      descEn: 'Available across all 64 districts with zero prepay hassle.',
    },
    {
      id: 'trust-badge-express',
      icon: Truck,
      titleBn: 'দ্রুত ডেলিভারি',
      titleEn: 'Express Shipping',
      descBn: 'ঢাকায় ২৪ ঘণ্টা ও সারাদেশে সর্বোচ্চ ৪৮ ঘণ্টায় হোম ডেলিভারি।',
      descEn: '24-hour delivery in Dhaka, 48-hour nationwide delivery.',
    },
    {
      id: 'trust-badge-returns',
      icon: RotateCcw,
      titleBn: 'সহজ রিটার্ন',
      titleEn: 'Easy 7-Day Returns',
      descBn: 'কোনো সমস্যা থাকলে ৭ দিনের মধ্যে সহজ এক্সচেঞ্জ ও রিফান্ড।',
      descEn: '7-day hassle-free replacement and verified warranty claim.',
    },
  ];

  if (variant === 'bar') {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                id={item.id}
                className="slate-bg border border-white/5 p-4 flex items-center gap-4 rounded-xl hover:border-[#D4AF37]/30 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center gold-text shrink-0 shadow-inner">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] font-bold text-white tracking-wide truncate">
                    {language === 'bn' ? item.titleBn : item.titleEn}
                  </div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-tighter truncate font-mono">
                    {language === 'bn' ? item.titleEn : item.titleBn}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              id={item.id}
              className="card-bg border border-[#1E1E24] hover:border-[#D4AF37]/40 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/80 relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center mb-4 gold-text group-hover:bg-[#D4AF37] group-hover:text-[#0A0A0C] transition-colors duration-300 shadow-md">
                <Icon className="w-6 h-6" />
              </div>

              <div className="text-sm font-bold text-white font-sans tracking-wide mb-1">
                {language === 'bn' ? item.titleBn : item.titleEn}
              </div>
              <div className="text-[10px] gold-text uppercase tracking-wider font-mono mb-2">
                {language === 'bn' ? item.titleEn : item.titleBn}
              </div>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                {language === 'bn' ? item.descBn : item.descEn}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

