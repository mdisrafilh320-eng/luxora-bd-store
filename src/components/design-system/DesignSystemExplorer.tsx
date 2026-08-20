import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ShoppingBag, 
  Layers, 
  Type, 
  Palette, 
  ShieldCheck, 
  Globe, 
  Database,
  ArrowRight,
  Heart,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LuxuryButton } from '../ui/LuxuryButton';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { SectionHeader } from '../ui/SectionHeader';
import { TrustBadges } from '../common/TrustBadges';
import { formatBDT } from '../../translations';

export const DesignSystemExplorer: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    toggleLanguage, 
    t, 
    cart, 
    wishlist, 
    user, 
    cartSubtotal,
    cartCount,
    setActiveView,
    addToast
  } = useApp();

  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');

  const copyToClipboard = (hex: string, label: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    addToast({
      type: 'success',
      titleEn: `Copied Token: ${label}`,
      titleBn: `টোকেন কপি হয়েছে: ${label}`,
      descriptionEn: `Hex code ${hex} copied to clipboard.`,
      descriptionBn: `হেক্স কোড ${hex} ক্লিপবোর্ডে কপি করা হয়েছে।`,
    });
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const colorTokens = [
    { name: 'Rich Black Background', hex: '#0A0A0C', role: 'Primary Body Background', class: 'bg-[#0A0A0C]' },
    { name: 'Pure Dark Surface', hex: '#121216', role: 'Card & Surface Elev-1', class: 'bg-[#121216]' },
    { name: 'Slate Contrast', hex: '#1E1E26', role: 'Borders & Elevated Panels', class: 'bg-[#1E1E26]' },
    { name: 'Brushed Luxury Gold', hex: '#D4AF37', role: 'Primary Accent & CTAs', class: 'bg-[#D4AF37]', textDark: true },
    { name: 'Vibrant Light Gold', hex: '#E5C158', role: 'Hover & Focus States', class: 'bg-[#E5C158]', textDark: true },
    { name: 'Pristine White', hex: '#EDEDED', role: 'Primary Typography', class: 'bg-[#EDEDED]', textDark: true },
    { name: 'Subtle Slate Gray', hex: '#8E8E98', role: 'Secondary / Subtitle Text', class: 'bg-[#8E8E98]', textDark: true },
    { name: 'Emerald Guarantee', hex: '#10B981', role: 'Stock & Verified Status', class: 'bg-[#10B981]', textDark: true },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Top Banner Header */}
      <div className="bg-[#121218] border border-[#D4AF37]/30 rounded-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                DESIGN SYSTEM ENGINE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-luxury font-bold text-white">
              {t('dsTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-[#9A9AA6] mt-2 max-w-2xl font-sans leading-relaxed">
              {t('dsSubtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LuxuryButton
              variant="outline-gold"
              size="sm"
              onClick={toggleLanguage}
              leftIcon={<Globe className="w-3.5 h-3.5" />}
            >
              Toggle Language: {language.toUpperCase()}
            </LuxuryButton>

            <LuxuryButton
              variant="primary-gold"
              size="sm"
              onClick={() => setActiveView('store')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {t('viewLiveStore')}
            </LuxuryButton>
          </div>
        </div>
      </div>

      {/* 1. Color Palette Tokens */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsColorPalette')}
            </h2>
          </div>
          <span className="text-xs text-[#7A7A88]">Click any card to copy HEX</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {colorTokens.map((token) => (
            <div
              key={token.hex}
              onClick={() => copyToClipboard(token.hex, token.name)}
              className="bg-[#121216] border border-[#22222C] hover:border-[#D4AF37]/50 rounded-sm p-4 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className={`w-full h-16 rounded-sm ${token.class} border border-white/10 mb-3 flex items-end justify-end p-2`}>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${token.textDark ? 'bg-black/80 text-white' : 'bg-white/90 text-black'}`}>
                  {copiedHex === token.hex ? 'COPIED!' : token.hex}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#EDEDED] font-sans group-hover:text-[#F3D078] transition-colors">
                {token.name}
              </h3>
              <p className="text-xs text-[#7A7A86] mt-0.5">{token.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Typography & Bilingual Scale */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsTypography')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-xs rounded-sm ${language === 'en' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8E8E98] hover:text-white'}`}
            >
              English (Inter & Cinzel)
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={`px-2.5 py-1 text-xs rounded-sm ${language === 'bn' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8E8E98] hover:text-white'}`}
            >
              বাংলা (Hind Siliguri)
            </button>
          </div>
        </div>

        <div className="bg-[#121216] border border-[#22222C] rounded-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1 pb-4 border-b border-[#1E1E28]">
            <span className="text-[11px] font-mono text-[#D4AF37] block">Display Luxury (Cinzel / 36px+)</span>
            <h1 className="text-3xl sm:text-4xl font-luxury font-bold text-white tracking-wide">
              {language === 'bn' ? 'লাক্সোরা বিডি — প্রিমিয়াম গ্যাজেট সম্ভার' : 'LUXORA BD — MINIMALIST PRECISION'}
            </h1>
          </div>

          <div className="space-y-1 pb-4 border-b border-[#1E1E28]">
            <span className="text-[11px] font-mono text-[#D4AF37] block">Section Title (Cinzel / 24px)</span>
            <h2 className="text-xl sm:text-2xl font-luxury font-bold text-white">
              {language === 'bn' ? '১০০% অথেনটিক গ্যাজেট ও অফিসিয়াল ওয়ারেন্টি' : '100% Authentic Tech & Official Warranties'}
            </h2>
          </div>

          <div className="space-y-1 pb-4 border-b border-[#1E1E28]">
            <span className="text-[11px] font-mono text-[#D4AF37] block">Body / Paragraph (Hind Siliguri / Plus Jakarta Sans / 15px)</span>
            <p className="text-sm sm:text-base text-[#A0A0AC] leading-relaxed max-w-3xl font-sans">
              {language === 'bn' 
                ? 'বাংলাদেশের গ্যাজেটপ্রেমীদের জন্য নির্বাচিত সেরা ফ্ল্যাগশিপ হেডফোন, স্মার্টওয়াচ এবং লাইফস্টাইল পণ্য। প্রতিটি পণ্যের সাথে পাচ্ছেন অফিসিয়াল ডিস্ট্রিবিউটর ওয়ারেন্টি এবং ৬৪ জেলায় ক্যাশ অন ডেলিভারি সুবিধা।'
                : 'Handpicked flagship audio, wearables, and refined workspace gear crafted for connoisseurs. Every order is backed by genuine serial numbers, direct distributor warranty, and verified Cash on Delivery across Bangladesh.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[10px] text-[#70707C] uppercase block">Currency Numeral Format</span>
              <span className="text-base font-bold text-[#E5C158] font-sans">
                {formatBDT(94500, language)}
              </span>
            </div>
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[10px] text-[#70707C] uppercase block">Active Language Token</span>
              <span className="text-base font-bold text-white">
                {language === 'bn' ? 'বাংলা (Bengali - bn)' : 'English (en)'}
              </span>
            </div>
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[10px] text-[#70707C] uppercase block">Font Stack</span>
              <span className="text-xs font-mono text-[#D4AF37]">
                {language === 'bn' ? 'Hind Siliguri' : 'Cinzel / Plus Jakarta'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Luxury Button Hierarchy */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsButtons')}
            </h2>
          </div>
        </div>

        <div className="bg-[#121216] border border-[#22222C] rounded-sm p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Primary Gold */}
            <div className="p-4 bg-[#161620] rounded-sm border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono text-[#D4AF37]">Variant: 'primary-gold'</span>
              <LuxuryButton 
                variant="primary-gold" 
                size="md"
                onClick={() => addToast({ type: 'success', titleEn: 'Primary Button Pressed', titleBn: 'প্রাইমারি বাটন ক্লিক হয়েছে' })}
                leftIcon={<ShoppingBag className="w-4 h-4" />}
              >
                {t('addToCart')}
              </LuxuryButton>
              <span className="text-[11px] text-[#70707C]">Key CTA for Bag & Checkout</span>
            </div>

            {/* Outline Gold */}
            <div className="p-4 bg-[#161620] rounded-sm border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono text-[#D4AF37]">Variant: 'outline-gold'</span>
              <LuxuryButton 
                variant="outline-gold" 
                size="md"
                onClick={() => addToast({ type: 'info', titleEn: 'Outline Button Clicked', titleBn: 'আউটলাইন বাটন ক্লিক হয়েছে' })}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {t('heroCtaSecondary')}
              </LuxuryButton>
              <span className="text-[11px] text-[#70707C]">Secondary actions & filters</span>
            </div>

            {/* Glass Slate */}
            <div className="p-4 bg-[#161620] rounded-sm border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono text-[#D4AF37]">Variant: 'glass-slate'</span>
              <LuxuryButton 
                variant="glass-slate" 
                size="md"
                onClick={() => addToast({ type: 'info', titleEn: 'Glass Button Clicked', titleBn: 'গ্লাস বাটন ক্লিক হয়েছে' })}
              >
                {t('buyNow')}
              </LuxuryButton>
              <span className="text-[11px] text-[#70707C]">Low-contrast subtle triggers</span>
            </div>

            {/* Danger / Alert */}
            <div className="p-4 bg-[#161620] rounded-sm border border-white/5 flex flex-col gap-3">
              <span className="text-xs font-mono text-[#D4AF37]">Variant: 'danger'</span>
              <LuxuryButton 
                variant="danger" 
                size="md"
                onClick={() => addToast({ type: 'warning', titleEn: 'Reset action simulated', titleBn: 'রিসেট সিমুলেট করা হয়েছে' })}
              >
                {t('clearCart')}
              </LuxuryButton>
              <span className="text-[11px] text-[#70707C]">Destructive actions</span>
            </div>

          </div>

          {/* Button Sizes Matrix */}
          <div className="pt-4 border-t border-[#20202C] flex flex-wrap items-center gap-4">
            <span className="text-xs text-[#80808C] uppercase tracking-wider">Size Scales:</span>
            <LuxuryButton size="sm" variant="primary-gold">Small (sm)</LuxuryButton>
            <LuxuryButton size="md" variant="primary-gold">Medium (md)</LuxuryButton>
            <LuxuryButton size="lg" variant="primary-gold">Large (lg)</LuxuryButton>
          </div>
        </div>
      </section>

      {/* 4. Form Controls & Badges */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsInputs')}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs Demo */}
          <div className="bg-[#121216] border border-[#22222C] rounded-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Input Tokens & Focus Glow
            </h3>
            
            <Input
              label="Standard Text Input"
              placeholder="e.g. Tanzir Ahmed"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              helperText="Focus ring features #D4AF37 gold border highlights"
            />

            <Input
              label="Bilingual Phone Field"
              placeholder="+880 17XX-XXXXXX"
              defaultValue="+880 1711 000000"
            />
          </div>

          {/* Badges Matrix */}
          <div className="bg-[#121216] border border-[#22222C] rounded-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Status Badges & Tokens
            </h3>
            
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Badge variant="gold-solid">Bestseller</Badge>
              <Badge variant="gold">Limited Edition</Badge>
              <Badge variant="slate">New Release</Badge>
              <Badge variant="sale">-15% Off</Badge>
              <Badge variant="success">In Stock</Badge>
              <Badge variant="outline">Verified COD</Badge>
            </div>

            <p className="text-xs text-[#80808C] pt-4 border-t border-[#1E1E28] leading-relaxed">
              Badges are mathematically proportioned to prevent line break glitches, featuring high-contrast text and subtle gold border strokes.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Trust & Credibility Widget Inspector */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsTrustWidget')}
            </h2>
          </div>
        </div>

        <div className="bg-[#0D0D10] border border-[#20202A] rounded-sm p-2">
          <TrustBadges variant="grid" />
        </div>
      </section>

      {/* 6. Global State Management Monitor */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#20202C] pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-bold font-luxury text-white">
              {t('dsStateEngine')}
            </h2>
          </div>
        </div>

        <div className="bg-[#121216] border border-[#22222C] rounded-sm p-6 font-mono text-xs text-[#A0A0AC] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[#656570] block">Language Slice:</span>
              <span className="text-[#D4AF37] font-bold text-sm">{language.toUpperCase()}</span>
            </div>
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[#656570] block">Cart Count:</span>
              <span className="text-white font-bold text-sm">{cartCount} items</span>
            </div>
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[#656570] block">Cart Subtotal:</span>
              <span className="text-[#E5C158] font-bold text-sm">{formatBDT(cartSubtotal, language)}</span>
            </div>
            <div className="p-3 bg-[#161620] rounded-sm border border-white/5">
              <span className="text-[#656570] block">Auth Session:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {user ? `${user.name} (${user.membershipTier})` : 'Guest User'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <LuxuryButton
              size="sm"
              variant="outline-gold"
              onClick={() => {
                addToast({
                  type: 'info',
                  titleEn: 'State Snapshot Verified',
                  titleBn: 'স্টেট স্ন্যাপশট যাচাইকৃত',
                  descriptionEn: 'All slices (Cart, Auth, Localization, Theme) synchronized in LocalStorage.',
                  descriptionBn: 'সকল স্টেট স্লাইস লোকালস্টোরেজে সফলভাবে সিঙ্ক রয়েছে।',
                });
              }}
            >
              Verify State Integrity
            </LuxuryButton>
          </div>
        </div>
      </section>

    </div>
  );
};
