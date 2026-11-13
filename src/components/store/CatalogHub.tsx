import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  ArrowUpDown,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CategoryItem } from '../../types';
import { formatBDT } from '../../translations';
import { ProductCard } from './ProductCard';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'reviews';

export const CatalogHub: React.FC = () => {
  const {
    products,
    categories,
    language,
    t,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isAdmin,
    setActiveView,
  } = useApp();

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Build horizontal filter strip: Always includes All & Free Delivery + dynamic admin categories
  const filterCategories = useMemo(() => {
    const baseAll: CategoryItem = {
      id: 'all',
      slug: 'all',
      nameEn: 'All Products',
      nameBn: 'সব পণ্য',
      order: 0,
      isActive: true,
    };
    const baseFreeDelivery: CategoryItem = {
      id: 'free-delivery',
      slug: 'free-delivery',
      nameEn: 'Free Delivery',
      nameBn: 'ফ্রি ডেলিভারি',
      order: 1,
      isActive: true,
    };

    const dynamicList = (categories || []).filter(
      (c) => c.isActive !== false && c.slug !== 'all' && c.slug !== 'free-delivery'
    );

    const existingFree = (categories || []).find((c) => c.slug === 'free-delivery');
    const freeItem = existingFree || baseFreeDelivery;

    return [baseAll, freeItem, ...dynamicList];
  }, [categories]);

  const availableBrands = useMemo(() => {
    const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
    return ['all', ...brands];
  }, [products]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedBrand !== 'all') count++;
    if (inStockOnly) count++;
    if (maxPrice < 200000) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedCategory, selectedBrand, inStockOnly, maxPrice, searchQuery]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setInStockOnly(false);
    setMaxPrice(200000);
    setSearchQuery('');
    setSortBy('featured');
  };

  // Lookup map so searching by a category's English or Bengali display name also matches products in that category
  const categorySearchMap = useMemo(() => {
    const map = new Map<string, string>();
    (categories || []).forEach((cat) => {
      const slug = (cat.slug || '').toLowerCase();
      if (slug) {
        map.set(slug, `${cat.nameEn || ''} ${cat.nameBn || ''}`.toLowerCase());
      }
    });
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = (searchQuery || '').toLowerCase().trim();

    const result = (products || []).filter((product) => {
      if (selectedCategory === 'free-delivery') {
        if (product.category !== 'free-delivery' && !product.freeDelivery) {
          return false;
        }
      } else if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      if (
        selectedBrand !== 'all' &&
        (product.brand || '').toLowerCase() !== selectedBrand.toLowerCase()
      ) {
        return false;
      }
      if (inStockOnly && (!product.inStock || (product.stockCount ?? 0) <= 0)) {
        return false;
      }
      if ((product.price ?? 0) > maxPrice) {
        return false;
      }
      if (normalizedQuery) {
        const categoryKey = (product.category || '').toLowerCase();
        const categoryDisplayNames = categorySearchMap.get(categoryKey) || '';
        const searchableText = [
          product.nameEn,
          product.nameBn,
          product.taglineEn,
          product.taglineBn,
          product.category,
          categoryDisplayNames,
          product.brand,
          product.sku,
          product.freeDelivery ? 'free delivery ফ্রি ডেলিভারি' : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(normalizedQuery)) {
          return false;
        }
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price ?? 0) - (b.price ?? 0);
      if (sortBy === 'price-desc') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'reviews') return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [
    products,
    categories,
    categorySearchMap,
    selectedCategory,
    selectedBrand,
    inStockOnly,
    maxPrice,
    searchQuery,
    sortBy,
  ]);

  return (
    <section
      id="catalog-section"
      className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-16"
    >
      {/* Top Bar: Clean Title + Active Search Indicator + Sort & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-[26px] font-light text-white tracking-tight">
            <span>{language === 'bn' ? 'আমাদের ' : 'Curated '}</span>
            <span className="font-semibold text-[#D4AF37]">
              {language === 'bn' ? 'কালেকশন' : 'Collection'}
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5 tabular-nums">
            {language === 'bn'
              ? `${filteredProducts.length}টি পণ্য প্রদর্শিত হচ্ছে`
              : `Showing ${filteredProducts.length} curated item${filteredProducts.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {/* Active Search Clear Button + Sort & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto sm:justify-end">
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#111217] border border-[#D4AF37]/40 text-xs text-white hover:border-[#D4AF37] flex items-center gap-2 transition-colors cursor-pointer max-w-full"
              title={language === 'bn' ? 'সার্চ রিসেট করুন' : 'Clear search query'}
            >
              <Search className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[200px]">
                “{searchQuery.trim()}”
              </span>
              <X className="w-3.5 h-3.5 text-neutral-400 hover:text-white shrink-0" />
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 sm:flex-initial">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort products"
                className="w-full sm:w-auto min-h-[44px] appearance-none bg-[#111217] border border-[#22232D] text-neutral-200 hover:border-white/20 rounded-xl pl-3.5 pr-9 py-2.5 text-sm sm:text-xs font-medium focus:outline-none focus:border-[#D4AF37] cursor-pointer"
              >
                <option value="featured">{language === 'bn' ? 'ফিচার্ড' : 'Featured'}</option>
                <option value="price-asc">{language === 'bn' ? 'দাম: কম → বেশি' : 'Price: Low → High'}</option>
                <option value="price-desc">{language === 'bn' ? 'দাম: বেশি → কম' : 'Price: High → Low'}</option>
                <option value="rating">{language === 'bn' ? 'সর্বোচ্চ রেটিং' : 'Top Rated'}</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                activeFiltersCount > 0
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-semibold'
                  : 'bg-[#111217] border-[#22232D] text-neutral-200 hover:border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{language === 'bn' ? 'ফিল্টার' : 'Filter'}</span>
              {activeFiltersCount > 0 && (
                <span className="ml-0.5 text-[10px] font-bold tabular-nums">({activeFiltersCount})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Dynamic Category Filter Bar */}
      <div
        className="flex items-center gap-2 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 no-scrollbar mb-6 sm:mb-7 border-b border-[#1A1A22]"
        role="tablist"
        aria-label="Product categories"
      >
        {filterCategories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          const isFreeDelivery = cat.slug === 'free-delivery';
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`snap-start min-h-[42px] px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#D4AF37] text-black font-semibold shadow-sm'
                  : 'bg-[#111217] border border-[#1E1E26] text-neutral-300 hover:text-white hover:border-[#D4AF37]/40'
              }`}
            >
              {isFreeDelivery && <Truck className="w-3.5 h-3.5 shrink-0" />}
              <span>{language === 'bn' ? cat.nameBn : cat.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid or Clean Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#111217] border border-[#1E1E26] rounded-2xl p-8 sm:p-12 text-center my-6">
          <div className="w-12 h-12 rounded-xl bg-[#181920] border border-white/10 flex items-center justify-center mx-auto mb-3 text-[#D4AF37]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            {products.length === 0
              ? language === 'bn'
                ? 'ক্যাটালগ বর্তমানে আপডেট হচ্ছে'
                : 'Catalog Being Curated'
              : t('noProductsFound')}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-5">
            {products.length === 0
              ? language === 'bn'
                ? 'নতুন প্রিমিয়াম কালেকশন শীঘ্রই আসছে।'
                : 'New signature items are being prepared.'
              : language === 'bn'
              ? 'এই ক্যাটাগরি বা সার্চে কোনো পণ্য পাওয়া যায়নি।'
              : 'No products matched the selected category or search query.'}
          </p>
          {products.length === 0 && isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="min-h-[44px] bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
            >
              {language === 'bn' ? 'অ্যাডমিন প্যানেল খুলুন' : 'Open Admin Panel'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetFilters}
              className="min-h-[44px] bg-[#D4AF37] text-black px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('resetFilters')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 xl:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Animated Slide-over Filter Drawer */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="w-screen max-w-sm sm:max-w-md bg-[#111217] border-l border-[#1E1E24] p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col justify-between overflow-y-auto text-[#F3F4F6] shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#1E1E24] mb-6">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                      <h3 className="text-base font-semibold text-white">
                        {language === 'bn' ? 'ফিল্টার অপশন' : 'Refine Selection'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilterDrawerOpen(false)}
                      className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                      aria-label="Close filters"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Category Selection */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">
                      {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                    </label>
                    <div className="space-y-1.5">
                      {filterCategories.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setSelectedCategory(c.slug)}
                          className={`w-full min-h-[44px] text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            selectedCategory === c.slug
                              ? 'bg-[#191A22] text-[#D4AF37] font-semibold border border-[#D4AF37]/30'
                              : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span>{language === 'bn' ? c.nameBn : c.nameEn}</span>
                          {selectedCategory === c.slug && <Check className="w-4 h-4 text-[#D4AF37]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brand Selection */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">
                      {language === 'bn' ? 'ব্র্যান্ড' : 'Brand'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableBrands.map((b) => (
                        <button
                          type="button"
                          key={b}
                          onClick={() => setSelectedBrand(b)}
                          className={`min-h-[42px] px-3 py-2 rounded-xl text-xs text-center uppercase tracking-wider transition-colors cursor-pointer truncate ${
                            selectedBrand === b
                              ? 'bg-[#D4AF37] text-black font-semibold'
                              : 'bg-[#181920] text-neutral-400 border border-white/5 hover:text-white'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Price */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        {language === 'bn' ? 'সর্বোচ্চ বাজেট' : 'Max Budget (BDT)'}
                      </label>
                      <span className="text-xs font-mono font-bold text-[#D4AF37] tabular-nums">
                        {formatBDT(maxPrice, language)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1000}
                      max={200000}
                      step={2000}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-[#D4AF37] cursor-pointer py-3"
                    />
                  </div>

                  {/* In-Stock Toggle */}
                  <div className="mb-6 pt-4 border-t border-[#1E1E24]">
                    <label className="flex items-center justify-between min-h-[44px] cursor-pointer">
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

                <div className="pt-4 border-t border-[#1E1E24] space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsFilterDrawerOpen(false)}
                    className="w-full min-h-[46px] bg-[#D4AF37] text-black font-bold uppercase tracking-widest text-xs py-3 rounded-xl hover:brightness-110 transition-all cursor-pointer"
                  >
                    {language === 'bn'
                      ? `পণ্য দেখুন (${filteredProducts.length})`
                      : `Show ${filteredProducts.length} Products`}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full min-h-[44px] text-center text-xs text-neutral-400 hover:text-white py-2 cursor-pointer"
                  >
                    {language === 'bn' ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
