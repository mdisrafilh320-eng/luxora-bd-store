import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export type ButtonVariant = 'primary-gold' | 'outline-gold' | 'glass-slate' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface LuxuryButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const LuxuryButton: React.FC<LuxuryButtonProps> = ({
  variant = 'primary-gold',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3.5 py-1.5 text-xs font-medium tracking-wider gap-1.5',
    md: 'px-5 py-2.5 text-sm font-medium tracking-wider gap-2',
    lg: 'px-7 py-3.5 text-base font-semibold tracking-wide gap-2.5',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    'primary-gold': 
      'bg-[#D4AF37] hover:bg-[#E5C158] active:bg-[#B89728] text-[#0A0A0C] font-semibold border border-[#E5C158]/50 shadow-md shadow-[#D4AF37]/15 hover:shadow-lg hover:shadow-[#D4AF37]/25 hover:-translate-y-0.5 transition-all duration-200',
    'outline-gold': 
      'bg-transparent hover:bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/60 hover:border-[#D4AF37] active:bg-[#D4AF37]/20 transition-all duration-200',
    'glass-slate': 
      'bg-[#1A1A22]/90 hover:bg-[#252530] text-[#EDEDED] border border-white/10 hover:border-white/20 active:bg-[#121216] backdrop-blur-md transition-all duration-200',
    'ghost': 
      'bg-transparent hover:bg-white/5 text-[#B0B0B8] hover:text-[#EDEDED] border border-transparent transition-all duration-200',
    'danger':
      'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-all duration-200',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center rounded-sm font-sans uppercase select-none cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};
