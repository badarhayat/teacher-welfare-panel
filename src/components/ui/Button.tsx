'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const isBusy = Boolean(loading);
    const base =
      'inline-flex min-h-11 items-center justify-center rounded-lg font-medium transition-all duration-100 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97] active:brightness-95 enabled:active:translate-y-px';

    const variants = {
      primary:
        'bg-navy-700 hover:bg-navy-800 text-white focus:ring-navy-500 bg-[#1e3a5f] hover:bg-[#162d4a] shadow-sm active:shadow-none',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400 shadow-sm active:shadow-none active:bg-slate-300',
      danger:
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm active:shadow-none active:bg-red-800',
      ghost: 'hover:bg-slate-100 text-slate-700 focus:ring-slate-400 active:bg-slate-200',
      outline:
        'border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white focus:ring-[#1e3a5f] active:bg-[#162d4a] active:text-white',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          isBusy && 'cursor-wait opacity-90',
          className
        )}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        aria-disabled={disabled || isBusy || undefined}
        {...props}
      >
        {isBusy && (
          <svg
            className="h-4 w-4 flex-shrink-0 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span className={cn(isBusy && 'opacity-90')}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
