import React from 'react';
import { 
  Headphones, 
  Watch, 
  Laptop, 
  Zap, 
  Camera, 
  Sparkles, 
  ArrowUpRight,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';

interface CategoryItemConfig {
  id: ProductCategory;
  nameEn: string;
  nameBn: string;
  descEn: string;
  descBn: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  accentColor: string;
}

export const CategoryGrid: React.FC = () => {
  const { language, selectedCategory, setSelectedCategory, products, t } = useApp();

  const categories: CategoryItemConfig[] = [
    {
      id: 'audio',
      nameEn: 'Audiophile & ANC',
      nameBn: 'অডিও ও নয়েজ ক্যানসেলিং',
      descEn: 'Studio sound, Hi-Res wireless audio & flagship headsets',
      descBn: 'স্টুডিও সাউন্ড, হাই-রেস অডিও ও ফ্ল্যাগশিপ হেডসেট',
      icon: Headphones,
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop',
      accentColor: '#D4AF37',
    },
    {
      id: 'wearables',
      nameEn: 'Smartwatches & Fitness',
      nameBn: 'স্মার্টওয়াচ ও ওয়্যারলেস ব্যান্ড',
      descEn: 'Titanium durability, GPS precision & health telemetry',
      descBn: 'টাইটানিয়াম কেসিং, জিপিএস ও সার্বক্ষণিক হেলথ ট্র্যাকিং',
      icon: Watch,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop',
      accentColor: '#E5C158',
    },
    {
      id: 'desk-charging',
      nameEn: 'Desk & Fast Charging',
      nameBn: 'ডেস্ক আর্কিটেকচার ও চার্জিং',
      descEn: '140W GaN chargers, custom mechanical boards & docks',
      descBn: '১৪০ ওয়াট GaN চার্জার, মেকানিকাল কিবোর্ড ও প্রিমিয়াম ডক',
      icon: Zap,
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=800&auto=format&fit=crop',
      accentColor: '#C5A059',
    },
    {
      id: 'apple-ecosystem',
      nameEn: 'Apple Ecosystem',
      nameBn: 'অ্যাপল ইকোসিস্টেম গিয়ার',
      descEn: 'Official MagSafe accessories, straps & luxury cases',
      descBn: 'ম্যাগসেফ অ্যাক্সেসরিজ, স্ট্র্যাপ ও প্রিমিয়াম কেস',
      icon: Laptop,
      image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?q=80&w=800&auto=format&fit=crop',
      accentColor: '#D4AF37',
    },
    {
      id: 'photography',
      nameEn: 'Gimbals & Creator Studio',
      nameBn: 'ফটোগ্রাফি ও কনটেন্ট স্টুডিও',
      descEn: 'Pocket 4K gimbals, wireless mics & cinematic glass',
      descBn: '৪কে জিম্বল, ওয়্যারলেস মাইক ও সিনেমাটিক গিয়ার',
      icon: Camera,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop',
      accentColor: '#E5C158',
    },
    {
      id: 'lifestyle',
      nameEn: 'Horween Leather & Everyday',
      nameBn: 'আমেরিকান হরউইন লেদার ও লাইফস্টাইল',
      descEn: 'Hand-crafted leather, minimalist EDC & premium gifts',
      descBn: 'হস্তনির্মিত আসল চামড়া, মিনিমালিস্ট ইডিসি ও লাক্সারি আইটেম',
      icon: Sparkles,
      image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=800&auto=format&fit=crop',
      accentColor: '#C5A059',
    },
  ];

  const getProductCountForCategory = (catId: ProductCategory) => {
    return products.filter((p) => p.category === catId).length;
  };

  const handleCategorySelect = (catId: ProductCategory) => {
    setSelectedCategory(catId);
    const catalogElem = document.getElementById('catalog-section');
    catalogElem?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-[1px] gold-bg" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase gold-text font-mono">
              {language === 'bn' ? 'ক্যাটাগরি সংগ্রহ' : 'CURATED DOMAINS'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light font-luxury text-white">
            <span>{language === 'bn' ? 'গ্যাজেট ও লাইফস্টাইল ' : 'Distinctive '}</span>
            <span className="font-bold italic gold-text">
              {language === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
            </span>
          </h2>
        </div>

        <button
          onClick={() => handleCategorySelect('all')}
          className="text-xs font-semibold gold-text hover:text-white flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>{language === 'bn' ? 'সকল ক্যাটাগরি ব্রাউজ করুন' : 'Explore All Collections'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const count = getProductCountForCategory(cat.id);
          const isSelected = selectedCategory === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`group relative card-bg border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-black/90 hover:-translate-y-1 ${
                isSelected 
                  ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50' 
                  : 'border-[#1E1E24] hover:border-[#D4AF37]/40'
              }`}
            >
              {/* Background ambient image with overlay */}
              <div className="h-44 w-full relative overflow-hidden bg-[#0D0D12]">
                <img
                  src={cat.image}
                  alt={cat.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 opacity-40 group-hover:opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/80 to-transparent" />
                
                {/* Top Badge Strip */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <div className="w-9 h-9 rounded-xl slate-bg border border-white/10 flex items-center justify-center gold-text shadow-md">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-gray-300">
                    {count} {language === 'bn' ? 'টি আইটেম' : 'Items'}
                  </span>
                </div>
              </div>

              {/* Card Footer Content */}
              <div className="p-5 relative z-10 -mt-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-base font-bold text-white group-hover:text-[#D4AF37] transition-colors font-sans">
                    {language === 'bn' ? cat.nameBn : cat.nameEn}
                  </h3>
                  <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-[#D4AF37] text-gray-400 group-hover:text-black flex items-center justify-center transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-sans">
                  {language === 'bn' ? cat.descBn : cat.descEn}
                </p>
              </div>

              {/* Bottom Gold Accent Active Bar */}
              {isSelected && (
                <div className="absolute bottom-0 inset-x-0 h-1 gold-bg" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
