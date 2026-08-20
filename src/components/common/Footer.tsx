import React from 'react';
import { Sparkles, MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { language, t, setActiveView, setSelectedCategory, cartCount, user } = useApp();

  return (
    <footer className="w-full bg-[#08080A] border-t border-[#1C1C24] text-[#EDEDED] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#1A1A22]">
          
          {/* Brand Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#14141A] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="font-luxury text-xl font-bold tracking-[0.2em] text-[#EDEDED]">
                LUXORA <span className="text-[#D4AF37]">BD</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#8E8E9C] leading-relaxed max-w-sm font-sans">
              {t('footerAbout')}
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{language === 'bn' ? '১০০% আসল পণ্যের নিশ্চয়তা ও অফিসিয়াল ওয়ারেন্টি' : 'Guaranteed 100% Genuine with Official Bangladesh Warranties'}</span>
            </div>
          </div>

          {/* Quick Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3 text-xs">
            <h4 className="font-bold uppercase tracking-widest text-[#D4AF37] font-luxury text-sm mb-4">
              {language === 'bn' ? 'সার্ভিস ও ট্র্যাকিং' : 'Services & Support'}
            </h4>
            <ul className="space-y-2 text-[#9A9AA8]">
              <li>
                <button
                  onClick={() => {
                    setActiveView('track');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full gold-bg" />
                  <span>{language === 'bn' ? 'লাইভ পার্সেল ট্র্যাকিং' : 'Live Courier Tracking'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('support');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  {language === 'bn' ? 'সহায়তা কেন্দ্র ও FAQ' : 'Help & FAQ Hub'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('store');
                    setSelectedCategory('audio');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  {t('catAudio')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('store');
                    setSelectedCategory('wearables');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer"
                >
                  {t('catWearables')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[#D4AF37] hover:underline font-semibold flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'এন্টারপ্রাইজ ইআরপি অ্যাডমিন' : 'Enterprise Admin ERP'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('design-system');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-neutral-400 hover:text-[#D4AF37] transition-colors"
                >
                  {t('navDesignSystem')}
                </button>
              </li>
            </ul>
          </div>

          {/* Concierge & Address (4 cols) */}
          <div className="lg:col-span-4 space-y-3 text-xs text-[#9A9AA8]">
            <h4 className="font-bold uppercase tracking-widest text-[#D4AF37] font-luxury text-sm mb-4">
              {t('footerSupport')}
            </h4>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>{t('footerAddress')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="font-sans font-semibold text-white">{t('footerHotline')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{t('footerEmail')}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>{t('footerHours')}</span>
            </div>
          </div>

        </div>

        {/* Bottom Payment Strip & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#70707C]">
          <p className="text-center md:text-left font-sans">
            {t('footerCopyright')}
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-[#60606C] mr-1 hidden sm:inline">
              {t('paymentMethods')}:
            </span>
            <div className="flex items-center gap-2">
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
                COD (Cash)
              </span>
            </div>
          </div>
        </div>

        {/* Live Theme & State Telemetry Bar */}
        <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-gray-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full gold-bg animate-pulse" />
            <span>State: LANG_{language.toUpperCase()} | CART_{cartCount} | {user ? `AUTH_ACTIVE (${user.membershipTier})` : 'GUEST_SESSION'}</span>
          </div>
          <div className="text-gray-600">
            THEME: ELEGANT DARK • LUXORA BD ARCHITECTURE
          </div>
        </div>

      </div>
    </footer>
  );
};
