import React from 'react';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  subtitle,
  align = 'center',
  className = '',
}) => {
  const isCenter = align === 'center';

  return (
    <div className={`flex flex-col ${isCenter ? 'items-center text-center' : 'items-start text-left'} mb-10 ${className}`}>
      {badge && (
        <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-[0.25em] mb-2 px-3 py-1 bg-[#D4AF37]/10 rounded-full border border-[#D4AF37]/20">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-luxury font-bold text-[#EDEDED] tracking-wide relative inline-block">
        {title}
        <span className="block h-[2px] w-12 bg-[#D4AF37] mt-3 mx-auto opacity-80" style={{ marginLeft: isCenter ? 'auto' : '0' }} />
      </h2>
      {subtitle && (
        <p className="text-sm sm:text-base text-[#9E9EA8] max-w-2xl mt-3 font-sans leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
