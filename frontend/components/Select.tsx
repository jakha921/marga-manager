import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  error?: string;
  icon?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, error, icon, className, ...props }, ref) => {
  return (
    <div className="w-full relative">
      {label && (
        <label className="block font-display font-bold text-[11px] text-[var(--text-secondary)] mb-2 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--text-secondary)] transition-colors pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)]",
            "font-body text-[13px] font-medium appearance-none",
            "py-3 pr-10 min-h-[46px] rounded-xl",
            "transition-all duration-200 ease-in-out",
            "focus:outline-none focus:border-[var(--text-muted)] focus:ring-4 focus:ring-[var(--bg-surface-2)]",
            "disabled:opacity-60 disabled:bg-[var(--bg-surface-2)]",
            "cursor-pointer",
            icon ? 'pl-10' : 'pl-4',
            error && 'border-red-300 focus:border-red-500',
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[var(--text-muted)]">
          <ChevronDown size={16} />
        </div>
      </div>
      {error && (
        <span className="text-red-500 text-[10px] font-medium mt-1.5 ml-1 block">{error}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;