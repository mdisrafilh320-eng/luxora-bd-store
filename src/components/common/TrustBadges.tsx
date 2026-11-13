import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TrustBadges: React.FC<{ variant?: 'minimal' | 'grid' | 'bar' | 'compact' }> = ({
  variant = 'minimal',
}) => {
  const { language, setIsReturnPolicyModalOpen } = useApp();

  const items = [
    {
      id: 'trust-7day-return',
      icon: RotateCcw,
      labelEn: '7-Day Easy Return',
      labelBn: '৭ দিনের সহজ রিটার্ন',
      onClick: () => setIsReturnPolicyModalOpen(true),
      clickable: true,
    },
    {
      id: 'trust-nationwide',
      icon: Truck,
      labelEn: 'Nationwide 64-District Delivery',
      labelBn: 'সারা বাংলাদেশে দ্রুত ডেলিভারি',
      clickable: false,
    },
    {
      id: 'trust-verified',
      icon: ShieldCheck,
      labelEn: 'Verified Authentic Quality',
      labelBn: '১০০% আসল ও যাচাইকৃত পণ্য',
      clickable: false,
    },
    {
      id: 'trust-warranty',
      icon: Award,
      labelEn: 'Official Warranty Support',
      labelBn: 'অফিসিয়াল ওয়ারেন্টি সাপোর্ট',
      clickable: false,
    },
  ];

  if (variant === 'minimal' || variant === 'bar' || variant === 'compact') {
    return (
      <section className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="border-y border-[#1A1A22] py-2 sm:py-2.5 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            const text = language === 'bn' ? item.labelBn : item.labelEn;
            if (item.clickable && item.onClick) {
              return (
                <button
                  key={item.id}
                  id={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="min-h-[40px] flex items-center justify-start gap-2 sm:gap-2.5 text-left text-[11px] sm:text-xs text-neutral-300 hover:text-[#D4AF37] transition-colors cursor-pointer group px-1.5 rounded-lg"
                >
                  <Icon className="w-4 h-4 text-[#D4AF37] shrink-0" />
                  <span className="font-medium underline decoration-[#D4AF37]/40 underline-offset-4 group-hover:decoration-[#D4AF37] truncate">
                    {text}
                  </span>
                </button>
              );
            }
            return (
              <div
                key={item.id}
                id={item.id}
                className="min-h-[40px] flex items-center justify-start gap-2 sm:gap-2.5 text-[11px] sm:text-xs text-neutral-300 px-1.5"
              >
                <Icon className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <span className="font-medium truncate">{text}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 border-t border-[#1A1A22] pt-6">
        {items.map((item) => {
          const Icon = item.icon;
          const text = language === 'bn' ? item.labelBn : item.labelEn;
          return (
            <div key={item.id} className="flex items-center gap-2.5 sm:gap-3 text-xs text-neutral-300">
              <Icon className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="font-medium">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
