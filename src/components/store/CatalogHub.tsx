import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Check, 
  ArrowUpDown, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductCategory, Product } from '../../types';
import { formatBDT } from '../../translations';
import { ProductCard } from './ProductCard';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews';

export const CatalogHub: React.FC = () => {
  const { 
    products, 
    language, 
    t, 
    selectedCategory, 
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    setQuickViewProduct,
    isAdmin,
    setActiveView
  } = useApp();

  // Local filter states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Extract unique brands from loaded products
  const availableBrands = useMemo(() => {
    const brands = Array.from(new Set(products.map((p) => p.brand)));
    return ['all', ...brands];
  }, [products]);

  // Categories list
  const categories: { id: ProductCategory; labelKey: string; nameEn: string; nameBn: string }[] = [
    { id: 'all', labelKey: 'catAll', nameEn: 'All Domains', nameBn: 'সব ক্যাটাগরি' },
    { id: 'audio', labelKey: 'catAudio', nameEn: 'Audio & ANC', nameBn: 'অডিও ও মিউজিক' },
    { id: 'wearables', labelKey: 'catWearables', nameEn: 'Smartwatches', nameBn: 'স্মার্টওয়াচ' },
    { id: 'desk-charging', labelKey: 'catDeskCharging', nameEn: 'Desk & GaN Charging', nameBn: 'ডেস্ক ও চার্জিং' },
    { id: 'apple-ecosystem', labelKey: 'catApple', nameEn: 'Apple Gear', nameBn: 'অ্যাপল গিয়ার' },
    { id: 'photography', labelKey: 'catPhotography', nameEn: 'Gimbal & Studio', nameBn: 'ফটোগ্রাফি ও ভিডিও' },
    { id: 'lifestyle', labelKey: 'catLifestyle', nameEn: 'Lifestyle & Horween', nameBn: 'লাইফস্টাইল লেদার' },
  ];

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedBrand !== 'all') count++;
    if (inStockOnly) count++;
    if (maxPrice < 100000) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCategory, selectedBrand, inStockOnly, maxPrice, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setInStockOnly(false);
    setMaxPrice(100000);
    setSearchQuery('');
    setSortBy('featured');
  };

  // Filter and Sort Engine
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      // Category
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }
      // Brand
      if (selectedBrand !== 'all' && product.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      // In-stock
      if (inStockOnly && !product.inStock) {
        return false;
      }
      // Max Price
      if (product.price > maxPrice) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEn = product.nameEn.toLowerCase().includes(q) || product.brand.toLowerCase().includes(q) || product.taglineEn.toLowerCase().includes(q);
        const matchBn = product.nameBn.toLowerCase().includes(q) || product.taglineBn.toLowerCase().includes(q);
        if (!matchEn && !matchBn) return false;
      }
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewsCount - a.reviewsCount;
      // Default: featured first, then rating
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [products, selectedCategory, selectedBrand, inStockOnly, maxPrice, searchQuery, sortBy]);

  return (
    <section id="catalog-section" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-[1px] gold-bg" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase gold-text font-mono">
              {language === 'bn' ? 'সম্পূর্ণ ক্যাটালগ' : 'CURATED REPERTORY'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light font-luxury text-white">
            <span>{language === 'bn' ? 'লাক্সারি গ্যাজেট ' : 'Minimalist '}</span>
            <span className="font-bold italic gold-text">
              {language === 'bn' ? 'কালেকশন' : 'Catalog'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 font-sans">
            {language === 'bn'
              ? '১০০% অরিজিনাল অথেনটিক গ্যাজেট, অফিসিয়াল ওয়ারেন্টি ও সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।'
              : 'Precision acoustics, titanium wearables, and desk architectures backed by nationwide COD.'}
          </p>
        </div>

        {/* Catalog Control Strip */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Filter Drawer Toggle Button */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeFiltersCount > 0
                ? 'gold-bg text-black font-bold shadow-md shadow-[#D4AF37]/20'
                : 'slate-bg border border-white/10 text-white hover:border-white/20'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ফিল্টার' : 'Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none slate-bg border border-white/10 text-white hover:border-white/20 rounded-full pl-4 pr-9 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="featured">{language === 'bn' ? 'বাছাইকৃত: ফিচার্ড' : 'Sort: Featured'}</option>
              <option value="price-asc">{language === 'bn' ? 'মূল্য: কম থেকে বেশি' : 'Price: Low to High'}</option>
              <option value="price-desc">{language === 'bn' ? 'মূল্য: বেশি থেকে কম' : 'Price: High to Low'}</option>
              <option value="rating">{language === 'bn' ? 'সর্বোচ্চ রেটিং' : 'Customer Rating'}</option>
              <option value="reviews">{language === 'bn' ? 'সর্বাধিক রিভিউ' : 'Most Reviewed'}</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar mb-8">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'gold-bg text-black font-bold shadow-lg shadow-[#D4AF37]/15'
                  : 'card-bg border border-[#1E1E24] text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {language === 'bn' ? cat.nameBn : cat.nameEn}
            </button>
          );
        })}
      </div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
          <span className="text-gray-500 font-mono text-[11px] uppercase tracking-wider">
            {language === 'bn' ? 'সক্রিয় ফিল্টার:' : 'Active Filters:'}
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full slate-bg border border-white/10 text-white text-[11px]">
              <span>Search: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery('')} className="hover:text-[#D4AF37] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full slate-bg border border-white/10 text-white text-[11px]">
              <span>Category: {selectedCategory}</span>
              <button onClick={() => setSelectedCategory('all')} className="hover:text-[#D4AF37] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedBrand !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full slate-bg border border-white/10 text-white text-[11px]">
              <span>Brand: {selectedBrand}</span>
              <button onClick={() => setSelectedBrand('all')} className="hover:text-[#D4AF37] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full slate-bg border border-white/10 text-emerald-400 text-[11px]">
              <span>In-Stock Only</span>
              <button onClick={() => setInStockOnly(false)} className="hover:text-white cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {maxPrice < 100000 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full slate-bg border border-white/10 text-white text-[11px]">
              <span>Under {formatBDT(maxPrice, language)}</span>
              <button onClick={() => setMaxPrice(100000)} className="hover:text-[#D4AF37] cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="text-[11px] text-[#D4AF37] hover:underline ml-auto font-bold cursor-pointer"
          >
            {language === 'bn' ? 'সব ক্লিয়ার করুন' : 'Clear All'}
          </button>
        </div>
      )}

      {/* Products Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="card-bg border border-[#1E1E24] rounded-3xl p-8 sm:p-12 text-center my-8">
          <div className="w-16 h-16 rounded-2xl slate-bg border border-white/5 flex items-center justify-center mx-auto mb-4 text-[#D4AF37] shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-sans mb-1">
            {products.length === 0
              ? (language === 'bn' ? 'ক্যাটালগ বর্তমানে আপডেট হচ্ছে' : 'Catalog Being Updated')
              : t('noProductsFound')}
          </h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6 font-sans">
            {products.length === 0
              ? (language === 'bn'
                  ? 'নতুন কালেকশন খুব শীঘ্রই যুক্ত করা হচ্ছে। এডমিন প্যানেল থেকে আপনার নিজস্ব পণ্য রেজিস্টার করুন।'
                  : 'New luxury inventory is arriving soon. Store administrators can register signature items from the Admin Panel.')
              : (language === 'bn'
                  ? 'আপনার নির্বাচিত ফিল্টারে কোনো গ্যাজেট পাওয়া যায়নি। ফিল্টার রিসেট করে আবার চেষ্টা করুন।'
                  : 'No luxury products match the selected criteria. Try adjusting the price range or filters.')}
          </p>
          {products.length === 0 && isAdmin ? (
            <button
              onClick={() => setActiveView('admin')}
              className="gold-bg text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'এডমিন প্যানেলে যান ও পণ্য যুক্ত করুন' : 'Open Admin Panel & Add Products'}</span>
            </button>
          ) : (
            <button
              onClick={handleResetFilters}
              className="gold-bg text-black px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('resetFilters')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Slide-over Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsFilterDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
            <div className="w-screen max-w-sm sm:max-w-md card-bg border-l border-[#1E1E24] p-5 sm:p-6 flex flex-col justify-between overflow-y-auto text-[#F3F4F6] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              
              {/* Header */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#1E1E24] mb-6">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-base font-bold font-luxury text-white">
                      {language === 'bn' ? 'ফিল্টার অপশন' : 'Refine Catalog'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 1. Category Selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <div className="space-y-1.5">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selectedCategory === c.id
                            ? 'slate-bg text-[#D4AF37] font-bold border border-white/10'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{language === 'bn' ? c.nameBn : c.nameEn}</span>
                        {selectedCategory === c.id && <Check className="w-4 h-4 text-[#D4AF37]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Brand Selection */}
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableBrands.map((b) => (
                      <button
                        key={b}
                        onClick={() => setSelectedBrand(b)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs text-center uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center ${
                          selectedBrand === b
                            ? 'gold-bg text-black font-bold'
                            : 'slate-bg text-gray-400 border border-white/5 hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Max Price Range Slider */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      {language === 'bn' ? 'সর্বোচ্চ বাজেট' : 'Max Budget (BDT)'}
                    </label>
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">
                      {formatBDT(maxPrice, language)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={100000}
                    step={2500}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#D4AF37] cursor-pointer py-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>৳5,000</span>
                    <span>৳100,000+</span>
                  </div>
                </div>

                {/* 4. In Stock Toggle */}
                <div className="mb-6 pt-4 border-t border-[#1E1E24]">
                  <label className="flex items-center justify-between cursor-pointer min-h-[44px]">
                    <span className="text-xs font-semibold text-white">
                      {language === 'bn' ? 'শুধুমাত্র স্টকে থাকা পণ্য' : 'In-Stock Items Only'}
                    </span>
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-5 h-5 accent-[#D4AF37] rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Drawer Footer CTA */}
              <div className="pt-4 border-t border-[#1E1E24] space-y-2">
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-full min-h-[44px] gold-bg text-black font-bold uppercase tracking-widest text-xs py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  {language === 'bn' ? `পণ্য দেখুন (${filteredProducts.length})` : `Show ${filteredProducts.length} Products`}
                </button>
                <button
                  onClick={handleResetFilters}
                  className="w-full min-h-[44px] text-center text-xs text-gray-400 hover:text-white py-2 cursor-pointer flex items-center justify-center"
                >
                  {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset All Filters'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
};
