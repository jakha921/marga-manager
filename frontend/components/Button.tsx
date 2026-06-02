import React from 'react';
import { cn } from '../cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles = "font-body font-medium transition-all duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded-xl";

  const variants = {
    primary: "bg-primary text-white hover:bg-[var(--border-color)] shadow-sm",
    secondary: "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-surface-2)] hover:border-[var(--text-muted)] shadow-sm",
    danger: "bg-[var(--bg-surface)] text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200",
    ghost: "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
  };

  const sizes = {
    sm: "py-2 px-4 text-xs",
    md: "py-2.5 px-5 text-sm min-h-[44px]",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;