import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate } from '../utils';
import { cn } from '../cn';

interface DateFilterProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const DateFilter: React.FC<DateFilterProps> = ({ label, value, onChange, className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.showPicker();
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block font-display font-bold text-[11px] text-[var(--text-secondary)] mb-2 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div 
        className="relative w-full bg-[var(--bg-surface-2)] border border-[var(--border-color)] hover:border-[var(--border-color)] transition-colors rounded-xl h-[46px] flex items-center px-4 cursor-pointer group"
      >
        <Calendar size={16} className="text-[var(--text-muted)] mr-3 group-hover:text-[var(--text-secondary)] transition-colors" />
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {value ? formatDate(value) : 'Select Date'}
        </span>
        <input
          type="date"
          value={value}
          onChange={onChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
    </div>
  );
};

export default DateFilter;
