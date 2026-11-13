import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_HERO_BANNERS } from '../../services/storefrontService';

export const HeroBanner: React.FC = () => {
  const {
    banners,
    language,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    products,
    categories,
  } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const activeBanners = useMemo(() => {
    const enabled = (banners || []).filter((b) => b.isActive !== false && b.imageUrl?.trim());
    return enabled.length > 0 ? enabled : [DEFAULT_HERO_BANNERS[0]];
  }, [banners]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Keep index bounded if admin deletes slides
  useEffect(() => {
    if (currentIndex >= activeBanners.length) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Auto-advance every 3.5 seconds when multiple slides exist
  useEffect(() => {
    if (prefersReducedMotion || isPaused || activeBanners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, prefersReducedMotion]);

  const currentSlide = activeBanners[currentIndex] || activeBanners[0];
  const title =
    language === 'bn'
      ? currentSlide.titleBn || currentSlide.titleEn
      : currentSlide.titleEn || currentSlide.titleBn;
  const subtitle =
    language === 'bn'
      ? currentSlide.subtitleBn || currentSlide.subtitleEn
      : currentSlide.subtitleEn || currentSlide.subtitleBn;
  const ctaText =
    language === 'bn'
      ? currentSlide.ctaTextBn || currentSlide.ctaTextEn || 'কালেকশন দেখুন'
      : currentSlide.ctaTextEn || currentSlide.ctaTextBn || 'Explore Collection';

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (
      activeBanners.length > 1 &&
      touchStartXRef.current !== null &&
      touchEndXRef.current !== null
    ) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      if (diff > 45) {
        handleNext();
      } else if (diff < -45) {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
    setTimeout(() => setIsPaused(false), 1200);
  };

  const handleExploreClick = () => {
    if (currentSlide.targetCategory) {
      setSelectedCategory(currentSlide.targetCategory);
    }
    const catalogElem = document.getElementById('catalog-section');
    catalogElem?.scrollIntoView({ behavior: 'smooth' });
  };

  const searchMatchCount = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return null;

    const categoryNameMap = new Map<string, string>();
    (categories || []).forEach((c) => {
      const slug = (c.slug || '').toLowerCase();
      if (slug) {
        categoryNameMap.set(slug, `${c.nameEn || ''} ${c.nameBn || ''}`.toLowerCase());
      }
    });

    return (products || []).filter((product) => {
      if (selectedCategory === 'free-delivery') {
        if (product.category !== 'free-delivery' && !product.freeDelivery) return false;
      } else if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      const catKey = (product.category || '').toLowerCase();
      const catNames = categoryNameMap.get(catKey) || '';
      const haystack = [
        product.nameEn,
        product.nameBn,
        product.taglineEn,
        product.taglineBn,
        product.category,
        catNames,
        product.brand,
        product.freeDelivery ? 'free delivery ফ্রি ডেলিভারি' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    }).length;
  }, [products, categories, selectedCategory, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catalogElem = document.getElementById('catalog-section');
    catalogElem?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      aria-label="Featured Promotions"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-5 pb-2 sm:pb-3"
    >
      {/* Dedicated Storefront Search Bar right above Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 mb-3 sm:mb-4">
        <div className="min-w-0 flex items-center gap-2">
          {searchMatchCount !== null && (
            <button
              type="button"
              onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-300 hover:text-[#D4AF37] transition-colors cursor-pointer tabular-nums"
            >
              <span className="font-semibold text-[#D4AF37]">{searchMatchCount}</span>
              <span>
                {language === 'bn'
                  ? 'টি পণ্য পাওয়া গেছে · নিচে দেখুন'
                  : `matching item${searchMatchCount === 1 ? '' : 's'} · View below`}
              </span>
              <ArrowDown className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>
          )}
        </div>

        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label={language === 'bn' ? 'পণ্য অনুসন্ধান' : 'Search products'}
          className="relative w-full md:w-80 lg:w-96 md:ml-auto"
        >
          <Search
            className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="home-product-search"
            type="text"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'bn'
                ? 'নাম, ক্যাটাগরি বা ট্যাগলাইন দিয়ে খুঁজুন...'
                : 'Search by product name, category, or tagline...'
            }
            className="w-full min-h-[44px] bg-[#111217] text-base sm:text-sm text-white placeholder-neutral-500 border border-[#22232D] hover:border-[#323442] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-xl pl-10 pr-11 py-2.5 focus:outline-none transition-colors shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              aria-label={language === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
              title={language === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[270px] sm:h-[360px] md:h-[420px] lg:h-[480px] xl:h-[520px] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#1E1E24] bg-gradient-to-br from-[#121218] via-[#0B0B0F] to-[#17140D] shadow-2xl group select-none"
      >
        {/* Background Slide Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || currentIndex}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0.25, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0.25 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {!imageErrorMap[currentIndex] && (
              <img
                src={currentSlide.imageUrl}
                alt={title || 'Luxora BD Featured Collection'}
                referrerPolicy="no-referrer"
                decoding="async"
                onError={() => setImageErrorMap((prev) => ({ ...prev, [currentIndex]: true }))}
                className="w-full h-full object-cover object-center"
              />
            )}
            {/* Contrast Scrims */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090B]/92 via-[#09090B]/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/80 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Editorial Copy Overlay */}
        <div className="relative z-10 h-full flex flex-col justify-center px-5 sm:px-10 md:px-12 lg:px-16 max-w-xl lg:max-w-2xl">
          <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
            <span className="w-5 sm:w-6 h-[1px] bg-[#D4AF37]" />
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.26em] text-[#D4AF37] font-semibold">
              LUXORA BD CURATED
            </span>
          </div>

          {title && (
            <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-[54px] font-light tracking-tight text-white leading-[1.12] mb-2.5 sm:mb-3 [text-wrap:balance]">
              {title}
            </h1>
          )}

          {subtitle && (
            <p className="text-xs sm:text-sm lg:text-base text-neutral-300/90 max-w-md leading-relaxed line-clamp-2 sm:line-clamp-3 mb-5 sm:mb-6 font-sans">
              {subtitle}
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={handleExploreClick}
              className="min-h-[44px] inline-flex items-center gap-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#0A0A0C] px-5 sm:px-7 py-2.5 sm:py-3 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] transition-all cursor-pointer active:scale-95 shadow-lg shadow-black/40 whitespace-nowrap"
            >
              <span>{ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Manual Prev / Next Controls */}
        {activeBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous banner"
              className="hidden sm:flex absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white/85 hover:text-white items-center justify-center sm:opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next banner"
              className="hidden sm:flex absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white/85 hover:text-white items-center justify-center sm:opacity-80 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Navigation Dots */}
        {activeBanners.length > 1 && (
          <div
            className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
            role="tablist"
            aria-label="Banner slides"
          >
            {activeBanners.map((slide, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setCurrentIndex(idx)}
                  className="p-1.5 cursor-pointer flex items-center justify-center"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      isSelected ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-white/40 hover:bg-white/75'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
