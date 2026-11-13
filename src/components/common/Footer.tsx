import React from 'react';
import { Sparkles, MapPin, Phone, Mail, Clock, ShieldCheck, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const {
    language,
    t,
    setActiveView,
    setSelectedCategory,
    categories,
    returnPolicy,
    setIsReturnPolicyModalOpen,
  } = useApp();

  const topCategories = (categories || []).filter((c) => c.isActive !== false).slice(0, 3);

  return (
    <footer className="w-full bg-[#08080A] border-t border-[#1C1C24] text-[#EDEDED] pt-12 sm:pt-14 pb-24 md:pb-10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[#1A1A22]">
          
          {/* Brand Info (5 cols) */}
          <div className="md:col-span-2 lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#14141A] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="font-luxury text-xl font-bold tracking-[0.2em] text-[#EDEDED]">
                LUXORA <span className="text-[#D4AF37]">BD</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#8E8E9C] leading-relaxed max-w-md font-sans">
              {t('footerAbout')}
            </p>

            {/* Editable 7-Day Return Policy Card Trigger in Footer */}
            <div className="p-4 rounded-xl bg-[#111217] border border-[#1E1E26] max-w-md space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#D4AF37] flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? returnPolicy.titleBn || returnPolicy.titleEn
                      : returnPolicy.titleEn || returnPolicy.titleBn}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                {language === 'bn'
                  ? returnPolicy.summaryBn || returnPolicy.summaryEn
                  : returnPolicy.summaryEn || returnPolicy.summaryBn}
              </p>
              <button
                type="button"
                id="footer-return-policy-btn"
                onClick={() => setIsReturnPolicyModalOpen(true)}
                className="min-h-[36px] inline-flex items-center text-xs font-semibold text-[#D4AF37] hover:underline cursor-pointer"
              >
                {language === 'bn' ? 'রিটার্ন নীতিমালা ও নির্দেশনা পড়ুন →' : 'Read Full Return Policy & Instructions →'}
              </button>
            </div>
          </div>

          {/* Quick Links (3 cols) */}
          <div className="lg:col-span-3 space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-widest text-[#D4AF37] font-luxury text-sm mb-3">
              {language === 'bn' ? 'সার্ভিস ও কালেকশন' : 'Services & Catalog'}
            </h4>
            <ul className="space-y-1 text-[#9A9AA8]">
              <li>
                <button
                  type="button"
                  onClick={() => setIsReturnPolicyModalOpen(true)}
                  className="min-h-[38px] py-1 hover:text-[#D4AF37] transition-colors cursor-pointer inline-flex items-center gap-1.5 font-medium text-neutral-200"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{language === 'bn' ? '৭ দিনের রিটার্ন নীতিমালা' : '7-Day Return Policy'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('track');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[38px] py-1 hover:text-[#D4AF37] transition-colors cursor-pointer inline-flex items-center"
                >
                  {language === 'bn' ? 'লাইভ পার্সেল ট্র্যাকিং' : 'Live Courier Tracking'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('support');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[38px] py-1 hover:text-[#D4AF37] transition-colors cursor-pointer inline-flex items-center"
                >
                  {language === 'bn' ? 'সহায়তা কেন্দ্র ও FAQ' : 'Help & FAQ Hub'}
                </button>
              </li>
              {topCategories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('store');
                      setSelectedCategory(cat.slug);
                      setTimeout(() => {
                        const el = document.getElementById('catalog-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }}
                    className="min-h-[38px] py-1 hover:text-[#D4AF37] transition-colors cursor-pointer inline-flex items-center"
                  >
                    {language === 'bn' ? cat.nameBn : cat.nameEn}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[38px] py-1 text-[#D4AF37] hover:underline font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'অ্যাডমিন প্যানেল (ERP)' : 'Enterprise Admin ERP'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Concierge & Address (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5 text-xs text-[#9A9AA8]">
            <h4 className="font-bold uppercase tracking-widest text-[#D4AF37] font-luxury text-sm mb-3">
              {t('footerSupport')}
            </h4>

            <div className="flex items-start gap-2.5 py-1">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{t('footerAddress')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <a 
                href="tel:01871693050" 
                className="min-h-[38px] inline-flex items-center font-sans font-semibold text-white hover:text-[#D4AF37] transition-colors"
                title="Call Hotline"
              >
                {t('footerHotline')}
              </a>
            </div>

            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <a 
                href="mailto:mdisrafilh320@gmail.com" 
                className="min-h-[38px] inline-flex items-center hover:text-[#D4AF37] transition-colors truncate"
                title="Send Email"
              >
                {t('footerEmail')}
              </a>
            </div>

            <div className="flex items-center gap-2.5 py-1">
              <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{t('footerHours')}</span>
            </div>
          </div>

        </div>

        {/* Bottom Payment Strip & Copyright */}
        <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#70707C]">
          <p className="text-center md:text-left font-sans">
            {t('footerCopyright')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <span className="text-[11px] uppercase tracking-wider text-[#60606C] mr-1 hidden sm:inline">
              {t('paymentMethods')}:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span className="px-2 py-1 bg-[#14141C] border border-[#22222E] rounded text-[11px] font-bold text-[#E2136E]">
                bKash
              </span>
              <span className="px-2 py-1 bg-[#14141C] border border-[#22222E] rounded text-[11px] font-bold text-[#F7931E]">
                Nagad
              </span>
              <span className="px-2 py-1 bg-[#14141C] border border-[#22222E] rounded text-[11px] font-bold text-[#4B79D8]">
                VISA
              </span>
              <span className="px-2 py-1 bg-[#14141C] border border-[#22222E] rounded text-[11px] font-bold text-[#EB001B]">
                Mastercard
              </span>
              <span className="px-2 py-1 bg-[#14141C] border border-[#D4AF37]/40 rounded text-[11px] font-bold text-[#D4AF37]">
                COD (Advance Fee)
              </span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
