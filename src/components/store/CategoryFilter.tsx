import React from 'react';
import { useApp } from '../../context/AppContext';
import { ProductCategory } from '../../types';

export const CategoryFilter: React.FC = () => {
  const { selectedCategory, setSelectedCategory, t } = useApp();

  const categories: { id: ProductCategory; labelKey: 'catAll' | 'catAudio' | 'catWearables' | 'catDeskCharging' | 'catApple' | 'catPhotography' | 'catLifestyle' }[] = [
    { id: 'all', labelKey: 'catAll' },
    { id: 'audio', labelKey: 'catAudio' },
    { id: 'wearables', labelKey: 'catWearables' },
    { id: 'desk-charging', labelKey: 'catDeskCharging' },
    { id: 'apple-ecosystem', labelKey: 'catApple' },
    { id: 'photography', labelKey: 'catPhotography' },
    { id: 'lifestyle', labelKey: 'catLifestyle' },
  ];

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            id={`filter-category-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              px-4 py-2 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-semibold rounded-full shrink-0 transition-all cursor-pointer select-none
              ${isSelected
                ? 'slate-bg gold-text border gold-border font-bold shadow-md shadow-black/80'
                : 'bg-[#121212] hover:bg-[#1E1E24] text-gray-500 hover:text-white border border-[#1E1E24]'
              }
            `}
          >
            {t(cat.labelKey)}
          </button>
        );
      })}
    </div>
  );
};
