import React from 'react';

export type BadgeVariant = 'gold' | 'gold-solid' | 'slate' | 'sale' | 'success' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gold',
  size = 'sm',
  children,
  className = '',
  icon,
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-wider',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wider',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    gold: 'bg-[#D4AF37]/15 text-[#E5C158] border border-[#D4AF37]/35',
    'gold-solid': 'bg-[#D4AF37] text-[#0A0A0C] font-bold border border-[#E5C158]',
    slate: 'bg-[#1E1E26] text-[#D0D0DA] border border-white/10',
    sale: 'bg-amber-950/40 text-amber-300 border border-amber-500/40',
    success: 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/35',
    outline: 'bg-transparent text-[#B8B8C2] border border-white/15',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-sm uppercase font-sans whitespace-nowrap
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
