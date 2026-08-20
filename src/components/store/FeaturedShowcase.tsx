import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Flame, Crown, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductCard } from './ProductCard';
import { SectionHeader } from '../ui/SectionHeader';

type ShowcaseTab = 'trending' | 'new' | 'bestsellers';

export const FeaturedShowcase: React.FC = () => {
  const { products, language, t, setSelectedCategory } = useApp();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('trending');

  const displayedProducts = useMemo(() => {
    switch (activeTab) {
      case 'new':
        return products.filter((p) => p.badge === 'new' || p.isFeatured).slice(0, 4);
      case 'bestsellers':
        return products.filter((p) => p.badge === 'bestseller' || p.reviewsCount > 50).slice(0, 4);
      case 'trending':
      default:
        return products.filter((p) => p.isFeatured || p.rating >= 4.9).slice(0, 4);
    }
  }, [products, activeTab]);

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-b border-[#1A1A24]">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 gold-text" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase gold-text font-mono">
              {language === 'bn' ? 'ফ্ল্যাগশিপ শোকেস' : 'EXCLUSIVE SHOWCASE'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light font-luxury text-white">
            <span>{language === 'bn' ? 'টপ ' : 'Spotlight '}</span>
            <span className="font-bold italic gold-text">
              {language === 'bn' ? 'গ্যাজেট কালেকশন' : 'Curations'}
            </span>
          </h2>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-full border border-white/5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'slate-bg gold-text border border-white/10 shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ট্রেন্ডিং' : 'Trending'}</span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'slate-bg gold-text border border-white/10 shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'নতুন রিলিজ' : 'New Arrivals'}</span>
          </button>

          <button
            onClick={() => setActiveTab('bestsellers')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bestsellers'
                ? 'slate-bg gold-text border border-white/10 shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'বেস্টসেলার' : 'Best Sellers'}</span>
          </button>
        </div>
      </div>

      {/* Grid with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
