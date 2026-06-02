import React, { forwardRef } from 'react';
import { cn } from '../cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, className, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block font-display font-bold text-[11px] text-slate-500 mb-2 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)]",
            "font-body text-[13px] font-medium placeholder-[var(--text-muted)]",
            "py-3 px-4 min-h-[46px] rounded-xl",
            "transition-all duration-200 ease-in-out",
            "focus:outline-none focus:border-[var(--text-muted)] focus:ring-4 focus:ring-[var(--bg-surface-2)]",
            "disabled:opacity-60 disabled:bg-[var(--bg-surface-2)]",
            icon && 'pl-10',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500/10',
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <span className="text-red-500 text-[10px] font-medium mt-1.5 ml-1 block">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;