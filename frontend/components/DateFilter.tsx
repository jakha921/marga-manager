import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';
import { formatDate } from '../utils';

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
    <div className={`relative ${className}`}>
      {label && (
        <label className="block font-display font-bold text-[11px] text-slate-500 mb-2 ml-1 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div 
        className="relative w-full bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors rounded-xl h-[46px] flex items-center px-4 cursor-pointer group"
      >
        <Calendar size={16} className="text-slate-400 mr-3 group-hover:text-slate-600 transition-colors" />
        <span className="text-[13px] font-medium text-slate-700">
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
