/**
 * 无障碍按钮组件（ARIA 增强版）
 */

import React, { forwardRef, type ButtonHTMLAttributes } from 'react';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

const variants = {
  primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-300',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ ariaLabel, icon, variant = 'primary', size = 'md', loading = false, disabled, className = '', onClick, onKeyDown, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading && onClick) onClick(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        (e.target as HTMLButtonElement).click();
      }
      if (onKeyDown) onKeyDown(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="button"
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`.trim()}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.924 3.159 8.042l2.841-2.751z"/>
          </svg>
        ) : icon ? (<span aria-hidden="true">{icon}</span>) : null}
        {children}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
export default AccessibleButton;
