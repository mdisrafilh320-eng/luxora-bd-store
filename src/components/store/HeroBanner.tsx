import React from 'react';
import { Sparkles, ArrowRight, Layers, ShieldCheck, Truck, Banknote } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HeroBanner: React.FC = () => {
  const { language, t, setActiveView, setSelectedCategory } = useApp();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Elegant Dark Main Hero Showcase Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 card-bg rounded-2xl sm:rounded-3xl border border-[#1E1E24] overflow-hidden relative shadow-2xl">
        
        {/* Left Column: Hero Content & CTAs */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-10">
          
          {/* Accent Tracking Line & Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[1px] gold-bg" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase gold-text font-mono">
              {t('heroBadge')}
            </span>
          </div>

          {/* Headline with Elegant Dark Typography */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-light leading-[1.1] mb-6 tracking-tight text-[#F3F4F6]">
            <span>{t('heroTitlePrefix')} </span>
            <br />
            <span className="font-bold italic gold-text font-serif">
              {t('heroTitleAccent')}
            </span>{' '}
            <span className="text-white/90 font-light">{t('heroTitleSuffix')}</span>
          </h1>

          {/* Subtitle description */}
          <p className="text-gray-400 text-sm sm:text-base max-w-lg mb-8 leading-relaxed font-sans">
            {t('heroSubtitle')}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => {
                setSelectedCategory('all');
                const catalogElem = document.getElementById('catalog-section');
                catalogElem?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="gold-bg text-[#0A0A0C] px-8 sm:px-10 py-3.5 sm:py-4 rounded-sm text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-[#D4AF37]/15"
            >
              <span>{t('heroCtaPrimary')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveView('design-system')}
              className="border border-white/20 px-8 sm:px-10 py-3.5 sm:py-4 rounded-sm text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-white cursor-pointer flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5 gold-text" />
              <span>{t('heroCtaSecondary')}</span>
            </button>
          </div>

          {/* Mini Trust Metrics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-10 pt-6 border-t border-[#1E1E24] w-full">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ShieldCheck className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>{t('heroTrustStat1')}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-tight">
                {t('heroTrustStat1Sub')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Truck className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>{t('heroTrustStat2')}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-tight">
                {t('heroTrustStat2Sub')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Banknote className="w-3.5 h-3.5 gold-text shrink-0" />
                <span>{t('heroTrustStat3')}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-tight">
                {t('heroTrustStat3Sub')}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Floating Luxury Visual Stage */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1E1E24] to-[#0A0A0C] relative overflow-hidden flex items-center justify-center p-8 sm:p-12 min-h-[380px] lg:min-h-[480px]">
          
          {/* Subtle Concentric Luxury Circles */}
          <div className="absolute w-[500px] h-[500px] border border-[#D4AF37]/5 rounded-full pointer-events-none" />
          <div className="absolute w-[350px] h-[350px] border border-[#D4AF37]/10 rounded-full pointer-events-none" />
          
          {/* Floating Luxury Device Specimen Card */}
          <div className="w-64 sm:w-72 h-80 sm:h-96 bg-gradient-to-b from-[#24242C] via-[#16161C] to-[#111115] rounded-3xl shadow-[0_50px_100px_-20px_rgba(212,175,55,0.25)] border border-white/10 rotate-[10deg] hover:rotate-[4deg] transition-all duration-500 flex flex-col p-6 items-center justify-between relative group z-10">
            
            {/* Top Indicator Bar */}
            <div className="w-full flex items-center justify-between">
              <div className="w-16 h-1 bg-white/20 rounded-full" />
              <span className="text-[9px] font-mono gold-text uppercase tracking-widest font-bold">100% ORIGINAL</span>
            </div>

            {/* Central Watermark & Specimen Visual */}
            <div className="text-center relative my-auto">
              <div className="text-white/5 text-7xl font-black italic select-none font-luxury leading-none">
                LUX
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-mono tracking-widest text-[#D4AF37] uppercase font-bold">SONY ANC PRO</span>
                <span className="text-lg font-bold text-white font-sans mt-0.5">WH-1000XM5</span>
                <span className="text-[11px] text-gray-400 font-mono mt-1">৳ 36,500</span>
              </div>
            </div>

            {/* Bottom Details Strip */}
            <div className="w-full flex justify-between items-end pt-4 border-t border-white/5">
              <div className="w-7 h-7 rounded-full gold-bg shadow-lg shadow-[#D4AF37]/40 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter text-right">
                <div>Serial: LX-900BD</div>
                <div className="text-[8px] text-emerald-400 font-semibold">Official Warranty</div>
              </div>
            </div>

          </div>

        </div>

      </section>
    </div>
  );
};

