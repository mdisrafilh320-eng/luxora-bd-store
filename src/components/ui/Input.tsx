import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#C0C0C8] tracking-wider uppercase">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-[#8E8E98] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full bg-[#121216] text-[#EDEDED] placeholder-[#6E6E78] text-sm
            rounded-sm border border-[#25252E] px-4 py-2.5
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50
            transition-colors duration-200
            disabled:opacity-50 disabled:bg-[#0E0E12]
            ${error ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/40' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-[#8E8E98] flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      {helperText && !error && <span className="text-[11px] text-[#7A7A85]">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';
